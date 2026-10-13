// Business logic for products. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const slugify = require('../../../utils/slugify');
const { removeUploadedFile } = require('../../../utils/file');
const { cleanHtml } = require('../../../utils/html');
const { pricing } = require('../../../utils/pricing');
const { withTransaction } = require('../../../config/db');
const categoryRepository = require('../category/category.repository');
const productRepository = require('./product.repository');
const variantService = require('./product-variant.service');
const { MIN_IMAGES, MAX_IMAGES } = require('./product.validation');

function toSlug(value) {
  const slug = slugify(value);
  if (!slug) {
    throw ApiError.badRequest('Validation failed', { slug: 'Slug must contain letters or numbers' });
  }
  return slug;
}

// Rejects with 409 listing every field already taken by another product.
async function assertUnique({ name, slug }, excludeId = null) {
  const errors = {};
  if (name !== undefined && (await productRepository.nameExists(name, excludeId))) {
    errors.name = 'Product name already exists';
  }
  if (slug !== undefined && (await productRepository.slugExists(slug, excludeId))) {
    errors.slug = 'Product slug already exists';
  }
  if (Object.keys(errors).length) {
    throw ApiError.conflict(Object.values(errors).join(', '), errors);
  }
}

// Two requests can pass assertUnique at the same time; the DB unique indexes catch the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'products_name_unique') {
    return ApiError.conflict('Product name already exists', { name: 'Product name already exists' });
  }
  if (err.code === '23505' && err.constraint === 'products_slug_key') {
    return ApiError.conflict('Product slug already exists', { slug: 'Product slug already exists' });
  }
  return err;
}

async function assertCategoryExists(categoryId) {
  if (!(await categoryRepository.findById(categoryId))) {
    throw ApiError.badRequest('Validation failed', { category_id: 'Category not found' });
  }
}

// Resolves each benefit's final image: a new upload, or (on update) one of the product's
// existing benefit images. Client-supplied paths outside that set are rejected.
function resolveBenefits(benefits, existingImages = new Set()) {
  return benefits.map((item, i) => {
    let image = item.image_upload ?? null;
    if (!image && item.image) {
      if (!existingImages.has(item.image)) {
        throw ApiError.badRequest('Validation failed', {
          [`benefits[${i}].image`]: 'Unknown image; upload a file in benefits[<index>][image]',
        });
      }
      image = item.image;
    }
    return { title: item.title.trim(), description: item.description ?? null, image };
  });
}

// Keeps only { title, description } per section, in the given order; description is editor HTML.
function cleanSpecifications(sections) {
  return sections.map((section) => ({
    title: section.title.trim(),
    description: cleanHtml(section.description),
  }));
}

async function getOrFail(id) {
  const product = await productRepository.findById(id);
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

// Product with its images and benefits.
async function getDetails(id) {
  const product = await getOrFail(id);
  const [images, benefits, combinations] = await Promise.all([
    productRepository.findImages(id),
    productRepository.findBenefits(id),
    variantService.getForProduct(id),
  ]);
  return {
    ...product,
    ...pricing(product),
    has_variants: combinations.variants.length > 0,
    images,
    benefits,
    attributes: combinations.attributes,
    variants: combinations.variants,
  };
}

async function list(filters, pagination) {
  const { items, total } = await productRepository.findAll(filters, pagination);
  return {
    items: items.map((item) => ({ ...item, ...pricing(item), has_variants: item.variant_count > 0 })),
    total,
  };
}

// Merges price/offer changes with the stored values and checks them together, so e.g. lowering
// the price below an existing offer price is caught. Returns the three columns to save (or {}).
function resolvePrice(existing, data) {
  if (data.price === undefined && data.offer_type === undefined && data.offer_value === undefined) return {};

  const price = data.price !== undefined ? data.price : existing.price;
  let offerType = data.offer_type !== undefined ? data.offer_type : existing.offer_type;
  let offerValue = data.offer_value !== undefined ? data.offer_value : existing.offer_value;
  if (price === null && data.offer_type === undefined) offerType = null; // clearing the price clears its offer
  if (!offerType) offerValue = null;

  if (offerType && price === null) {
    throw ApiError.badRequest('Validation failed', { price: 'Set a price to add an offer' });
  }
  if (offerType && offerValue === null) {
    throw ApiError.badRequest('Validation failed', { offer_value: 'Offer value is required' });
  }
  if (offerType === 'price' && offerValue >= price) {
    throw ApiError.badRequest('Validation failed', { offer_value: 'Offer price must be less than the price' });
  }
  return { price, offer_type: offerType || null, offer_value: offerValue };
}

async function create(data) {
  const slug = toSlug(data.slug || data.name);
  await assertUnique({ name: data.name, slug });
  await assertCategoryExists(data.category_id);
  const benefits = resolveBenefits(data.benefits || []);

  const id = await withTransaction(async (client) => {
    const productId = await productRepository.create({
      category_id: data.category_id,
      name: data.name,
      slug,
      feature: data.feature ?? null,
      short_description: data.short_description ?? null,
      long_description: data.long_description ?? null,
      feature_list: (data.feature_list || []).map((item) => item.trim()),
      price: data.price ?? null,
      offer_type: data.offer_type || null,
      offer_value: data.offer_type ? data.offer_value : null,
      specifications: cleanSpecifications(data.specifications || []),
      package_details: cleanHtml(data.package_details),
      box_contents: cleanHtml(data.box_contents),
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    }, client);
    await productRepository.addImages(productId, data.images, 0, client);
    await productRepository.replaceBenefits(productId, benefits, client);
    return productId;
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });

  return getDetails(id);
}

async function update(id, data) {
  const existing = await getDetails(id);

  const changes = { ...data, ...resolvePrice(existing, data) };
  if (data.slug !== undefined) changes.slug = toSlug(data.slug);
  if (data.feature_list !== undefined) changes.feature_list = data.feature_list.map((item) => item.trim());
  if (data.specifications !== undefined) changes.specifications = cleanSpecifications(data.specifications);
  if (data.package_details !== undefined) changes.package_details = cleanHtml(data.package_details);
  if (data.box_contents !== undefined) changes.box_contents = cleanHtml(data.box_contents);
  await assertUnique({ name: changes.name, slug: changes.slug }, id);
  if (data.category_id !== undefined) await assertCategoryExists(data.category_id);

  // Images: remove the requested ones, append new uploads, keep the total within limits.
  const removeIds = [...new Set(data.remove_image_ids || [])];
  const existingImageIds = new Set(existing.images.map((img) => img.id));
  const unknownIds = removeIds.filter((imageId) => !existingImageIds.has(imageId));
  if (unknownIds.length) {
    throw ApiError.badRequest('Validation failed', {
      remove_image_ids: `Image id(s) ${unknownIds.join(', ')} do not belong to this product`,
    });
  }
  const newImages = data.images || [];
  const finalCount = existing.images.length - removeIds.length + newImages.length;
  if (finalCount < MIN_IMAGES) {
    throw ApiError.badRequest('Validation failed', { images: `A product needs at least ${MIN_IMAGES} images` });
  }
  if (finalCount > MAX_IMAGES) {
    throw ApiError.badRequest('Validation failed', { images: `A product can have at most ${MAX_IMAGES} images` });
  }

  const oldBenefitImages = new Set(existing.benefits.map((b) => b.image).filter(Boolean));
  const benefits = data.benefits !== undefined ? resolveBenefits(data.benefits, oldBenefitImages) : undefined;

  await withTransaction(async (client) => {
    await productRepository.update(id, changes, client);
    await productRepository.removeImages(id, removeIds, client);
    const nextOrder = Math.max(-1, ...existing.images.map((img) => img.sort_order)) + 1;
    await productRepository.addImages(id, newImages, nextOrder, client);
    if (benefits) await productRepository.replaceBenefits(id, benefits, client);
    await productRepository.touch(id, client);
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });

  // Delete files only after the DB change is committed.
  existing.images.filter((img) => removeIds.includes(img.id)).forEach((img) => removeUploadedFile(img.image));
  if (benefits) {
    const kept = new Set(benefits.map((b) => b.image));
    oldBenefitImages.forEach((image) => !kept.has(image) && removeUploadedFile(image));
  }

  return getDetails(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await productRepository.update(id, { is_active: isActive });
  return getOrFail(id);
}

async function remove(id) {
  const product = await getDetails(id);
  await productRepository.remove(id);
  product.images.forEach((img) => removeUploadedFile(img.image));
  product.benefits.forEach((b) => removeUploadedFile(b.image));
}

module.exports = { list, getById: getDetails, create, update, setStatus, remove };
