// Business logic for website products. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { pricing } = require('../../../utils/pricing');
const { formatVariant, summarizeAttributes } = require('../../../utils/variants');
const productRepository = require('./product.repository');

// "2G GPS, All Vehicles" -> ["2G GPS", "All Vehicles"] (the badges on cards and details).
const featureTags = (feature) => (feature ? feature.split(',').map((t) => t.trim()).filter(Boolean) : []);

// Shared shape for cards and details: badges, category, and prices.
//   has_variants false -> show final_price (and price struck through when discount_amount > 0)
//   has_variants true  -> show min_price (– max_price); the customer picks a combination
function formatProduct({ category_id: id, category_name: name, category_slug: slug, ...product }, variantCount) {
  const hasVariants = variantCount > 0;
  return {
    ...product,
    ...pricing(product),
    feature_tags: featureTags(product.feature),
    category: { id, name, slug },
    has_variants: hasVariants,
  };
}

function formatCard({ variant_count: count, min_variant_price: min, max_variant_price: max, ...row }) {
  const card = formatProduct(row, count);
  return { ...card, min_price: card.has_variants ? min : card.final_price, max_price: card.has_variants ? max : card.final_price };
}

async function latest(limit) {
  return (await productRepository.findLatest(limit)).map(formatCard);
}

async function list(filters, pagination) {
  const { items, total } = await productRepository.findAll(filters, pagination);
  return { items: items.map(formatCard), total };
}

async function getBySlug(slug) {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw ApiError.notFound('Product not found');

  const [images, benefits, variantRows] = await Promise.all([
    productRepository.findImages(product.id),
    productRepository.findBenefits(product.id),
    productRepository.findVariants(product.id),
  ]);
  const variants = variantRows.map(formatVariant);
  const attributes = summarizeAttributes(variants);
  // Keep the variant values compact for the client (sort orders were only needed for the buttons).
  const cleanVariants = variants.map((v) => ({
    ...v,
    values: v.values.map(({ attribute_sort_order: _a, value_sort_order: _v, ...value }) => value),
  }));

  const finals = variants.map((v) => v.final_price);
  const details = formatProduct(product, variants.length);
  return {
    ...details,
    min_price: details.has_variants ? Math.min(...finals) : details.final_price,
    max_price: details.has_variants ? Math.max(...finals) : details.final_price,
    images,
    benefits,
    attributes,
    variants: cleanVariants,
  };
}

module.exports = { latest, list, getBySlug };
