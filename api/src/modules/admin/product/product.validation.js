// Request validators for products, used with middlewares/validate.
const ApiError = require('../../../utils/ApiError');
const { toIntOrNull, toInt, toBool, toStringOrNull, toList, parseJson } = require('../../../utils/formData');
const { OFFER_TYPES } = require('../../../utils/pricing');

const hasTwoDecimals = (n) => Math.round(n * 100) === n * 100;

const MIN_IMAGES = 1;
const MAX_IMAGES = 10;
const MAX_BENEFITS = 20;
const MAX_FEATURE_LIST = 30;
const MAX_SPEC_SECTIONS = 30;
const MAX_HTML_LENGTH = 100000;
const BENEFIT_IMAGE_FIELD = /^benefits\[(\d+)\]\[image\]$/;

// File fields accepted by the upload middleware, per tab.
const isGalleryField = (name) => name === 'images';
const isBenefitImageField = (name) => BENEFIT_IMAGE_FIELD.test(name);

// Body fields each admin tab saves. The controller keeps only these for each endpoint.
const FIELDS = {
  create: ['category_id', 'name', 'slug', 'feature', 'short_description', 'long_description',
    'feature_list', 'price', 'offer_type', 'offer_value', 'sort_order', 'is_active', 'images'],
  basic: ['category_id', 'name', 'slug', 'feature', 'short_description', 'long_description',
    'feature_list', 'price', 'offer_type', 'offer_value', 'sort_order', 'is_active', 'images', 'remove_image_ids'],
  benefits: ['benefits'],
  specifications: ['specifications'],
  packageDetails: ['package_details'],
  boxContents: ['box_contents'],
  variants: ['variants'],
};

const MAX_VARIANTS = 200;
const MAX_PRICE = 9999999999.99;

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const isOptionalText = (value) => value === undefined || value === null || typeof value === 'string';

// price / offer_type / offer_value arrive as strings in form-data: numeric strings -> numbers,
// "" / "null" -> null, offer_type "" / "none" -> null (no offer). Mutates obj.
function normalizePrice(obj) {
  for (const field of ['price', 'offer_value']) {
    const v = obj[field];
    if (typeof v !== 'string') continue;
    if (v.trim() === '' || v.trim() === 'null') obj[field] = null;
    else if (!Number.isNaN(Number(v))) obj[field] = Number(v);
  }
  if (obj.offer_type !== undefined) {
    const type = toStringOrNull(obj.offer_type);
    obj.offer_type = typeof type === 'string' && type.trim().toLowerCase() === 'none' ? null : type;
  }
}

// Middleware: converts form-data strings to real types and attaches uploaded files:
//   images files              -> body.images (array of paths)
//   benefits[i][image] files  -> body.benefits[i].image_upload
// Runs after the upload middleware and before validate(); JSON bodies work too.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };

  if (body.category_id !== undefined) body.category_id = toIntOrNull(body.category_id);
  if (body.sort_order !== undefined) body.sort_order = toInt(body.sort_order);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  for (const key of ['feature', 'short_description', 'long_description', 'package_details', 'box_contents']) {
    if (body[key] !== undefined) body[key] = toStringOrNull(body[key]);
  }
  if (body.feature_list !== undefined) body.feature_list = toList(body.feature_list);
  normalizePrice(body);
  if (body.specifications !== undefined) {
    // JSON string, or form-data like specifications[0][title] / specifications[0][description]
    body.specifications = parseJson(body.specifications);
    if (Array.isArray(body.specifications)) {
      body.specifications = Array.from(body.specifications, (section) =>
        section && typeof section === 'object'
          ? { ...section, description: toStringOrNull(section.description) }
          : section,
      );
    }
  }
  if (body.variants !== undefined) {
    // JSON string, or form-data like variants[0][values][0]=3 / variants[0][price]=4000
    body.variants = parseJson(body.variants);
    if (Array.isArray(body.variants)) {
      body.variants = Array.from(body.variants, (item) => {
        if (!item || typeof item !== 'object') return item;
        const variant = { ...item };
        if (variant.id !== undefined) variant.id = toInt(String(variant.id));
        if (variant.values !== undefined) {
          const values = toList(variant.values);
          variant.values = Array.isArray(values) ? values.map((v) => toInt(String(v))) : values;
        }
        normalizePrice(variant);
        if (variant.sku !== undefined) variant.sku = toStringOrNull(variant.sku);
        if (variant.is_active !== undefined) variant.is_active = toBool(variant.is_active);
        return variant;
      });
    }
  }
  if (body.remove_image_ids !== undefined) {
    const ids = toList(body.remove_image_ids);
    body.remove_image_ids = Array.isArray(ids) ? ids.map((id) => toInt(String(id))) : ids;
  }
  if (body.benefits !== undefined) {
    body.benefits = parseJson(body.benefits);
    if (Array.isArray(body.benefits)) {
      body.benefits = Array.from(body.benefits, (item) =>
        item && typeof item === 'object'
          ? { ...item, description: toStringOrNull(item.description), image: toStringOrNull(item.image) }
          : item,
      );
    }
  }

  // Images are accepted only as uploaded files, never as client-supplied paths.
  delete body.images;
  const files = req.files || [];
  const galleryFiles = files.filter((file) => file.fieldname === 'images');
  if (galleryFiles.length) body.images = galleryFiles.map((file) => file.publicPath);

  for (const file of files) {
    const match = BENEFIT_IMAGE_FIELD.exec(file.fieldname);
    if (!match) continue;
    const index = Number(match[1]);
    const benefit = Array.isArray(body.benefits) ? body.benefits[index] : undefined;
    if (!benefit || typeof benefit !== 'object') {
      return next(ApiError.badRequest('Validation failed', { [file.fieldname]: `No benefit at index ${index} for this image` }));
    }
    benefit.image_upload = file.publicPath;
  }

  req.body = body;
  return next();
}

function benefitErrors(benefits, errors) {
  if (!Array.isArray(benefits)) {
    errors.benefits = 'benefits must be a list of { title, description, image }';
    return;
  }
  if (benefits.length > MAX_BENEFITS) {
    errors.benefits = `At most ${MAX_BENEFITS} benefits are allowed`;
    return;
  }
  benefits.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      errors[`benefits[${i}]`] = 'Must be an object with title, description, image';
      return;
    }
    if (typeof item.title !== 'string' || !item.title.trim()) {
      errors[`benefits[${i}].title`] = 'Title is required';
    } else if (item.title.trim().length > 200) {
      errors[`benefits[${i}].title`] = 'Title must be at most 200 characters';
    }
    if (!isOptionalText(item.description)) {
      errors[`benefits[${i}].description`] = 'Description must be text';
    }
    if (!isOptionalText(item.image)) {
      errors[`benefits[${i}].image`] = 'Image must be the path of an existing benefit image, or upload a file';
    }
  });
}

function specificationErrors(sections, errors) {
  if (!Array.isArray(sections)) {
    errors.specifications = 'specifications must be a list of { title, description }';
    return;
  }
  if (sections.length > MAX_SPEC_SECTIONS) {
    errors.specifications = `At most ${MAX_SPEC_SECTIONS} specification sections are allowed`;
    return;
  }
  sections.forEach((section, i) => {
    const key = `specifications[${i}]`;
    if (!section || typeof section !== 'object') {
      errors[key] = 'Must be an object with title and description';
      return;
    }
    if (typeof section.title !== 'string' || !section.title.trim()) {
      errors[`${key}.title`] = 'Section title is required';
    } else if (section.title.trim().length > 200) {
      errors[`${key}.title`] = 'Section title must be at most 200 characters';
    }
    if (!isOptionalText(section.description)
      || (typeof section.description === 'string' && section.description.length > MAX_HTML_LENGTH)) {
      errors[`${key}.description`] = `Description must be HTML text of at most ${MAX_HTML_LENGTH} characters`;
    }
  });
}

function htmlErrors(body, key, errors) {
  if (!isOptionalText(body[key]) || (typeof body[key] === 'string' && body[key].length > MAX_HTML_LENGTH)) {
    errors[key] = `${key} must be HTML text of at most ${MAX_HTML_LENGTH} characters`;
  }
}

// Basic Information rules; `partial` skips required checks (for updates).
function basicErrors(body, { partial }) {
  const errors = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Product name is required';
    } else if (body.name.trim().length > 200) {
      errors.name = 'Product name must be at most 200 characters';
    }
  }
  if (body.category_id !== undefined || !partial) {
    if (!isPositiveInt(body.category_id)) errors.category_id = 'Category is required';
  }
  if (body.slug !== undefined && (typeof body.slug !== 'string' || !body.slug.trim() || body.slug.length > 220)) {
    errors.slug = 'Slug must be a non-empty string of at most 220 characters';
  }
  if (!isOptionalText(body.feature) || (typeof body.feature === 'string' && body.feature.length > 255)) {
    errors.feature = 'Feature must be text of at most 255 characters';
  }
  if (!isOptionalText(body.short_description)) errors.short_description = 'Short description must be text';
  if (!isOptionalText(body.long_description)) errors.long_description = 'Long description must be text';
  if (body.feature_list !== undefined) {
    const list = body.feature_list;
    if (!Array.isArray(list) || list.some((item) => typeof item !== 'string' || !item.trim() || item.length > 100)) {
      errors.feature_list = 'feature_list must be a list of texts (each at most 100 characters)';
    } else if (list.length > MAX_FEATURE_LIST) {
      errors.feature_list = `At most ${MAX_FEATURE_LIST} items are allowed`;
    }
  }
  // Optional: products sold through combinations are priced per combination. null clears it.
  if (body.price !== undefined && body.price !== null) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > MAX_PRICE) {
      errors.price = 'Price must be a number, 0 or more';
    } else if (!hasTwoDecimals(body.price)) {
      errors.price = 'Price can have at most 2 decimal places';
    }
  }
  if (body.offer_type !== undefined || body.offer_value !== undefined) offerErrors(body, '', errors);
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    errors.sort_order = 'sort_order must be an integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }

  return errors;
}

// POST /products — Basic Information incl. at least MIN_IMAGES images.
function create(body) {
  const errors = basicErrors(body, { partial: false });
  if (body.offer_type && (body.price === undefined || body.price === null) && !errors.offer_type) {
    errors.price = 'Set a price to add an offer';
  }
  const count = body.images?.length || 0;
  if (count < MIN_IMAGES) errors.images = MIN_IMAGES === 1 ? 'At least 1 image is required' : `At least ${MIN_IMAGES} images are required`;
  else if (count > MAX_IMAGES) errors.images = `At most ${MAX_IMAGES} images are allowed`;
  return errors;
}

// PUT /products/:id/basic — any subset of Basic Information, plus image add/remove.
function basic(body) {
  const errors = basicErrors(body, { partial: true });
  if (body.remove_image_ids !== undefined
    && (!Array.isArray(body.remove_image_ids) || !body.remove_image_ids.every(isPositiveInt))) {
    errors.remove_image_ids = 'remove_image_ids must be a list of image ids';
  }
  if (!FIELDS.basic.some((key) => body[key] !== undefined)) {
    errors.body = `Provide at least one of: ${FIELDS.basic.join(', ')}`;
  }
  return errors;
}

// Requires `key` to be sent (an empty list / empty editor is allowed, to clear the tab).
function required(body, key, errors, hint) {
  if (body[key] === undefined) errors[key] = `${key} is required (${hint})`;
  return body[key] !== undefined;
}

// PUT /products/:id/benefits — replaces the whole list.
function benefits(body) {
  const errors = {};
  if (required(body, 'benefits', errors, 'send [] to remove all')) benefitErrors(body.benefits, errors);
  return errors;
}

// PUT /products/:id/specifications — replaces the whole list.
function specifications(body) {
  const errors = {};
  if (required(body, 'specifications', errors, 'send [] to remove all')) specificationErrors(body.specifications, errors);
  return errors;
}

// PUT /products/:id/package-details
function packageDetails(body) {
  const errors = {};
  if (required(body, 'package_details', errors, 'send an empty value to clear')) htmlErrors(body, 'package_details', errors);
  return errors;
}

// PUT /products/:id/box-contents
function boxContents(body) {
  const errors = {};
  if (required(body, 'box_contents', errors, 'send an empty value to clear')) htmlErrors(body, 'box_contents', errors);
  return errors;
}

// Optional offer: offer_type 'price' (offer_value = selling price, below price)
// or 'percentage' (offer_value = % off, more than 0 and below 100). No offer_type = no offer.
// `key` prefixes error names ("variants[0]" -> "variants[0].offer_value"; "" -> "offer_value").
function offerErrors(item, key, errors) {
  const name = (field) => (key ? `${key}.${field}` : field);
  const type = item.offer_type;
  if (type === undefined || type === null) {
    if (item.offer_value !== undefined && item.offer_value !== null) {
      errors[name('offer_type')] = `offer_type is required with offer_value (${OFFER_TYPES.join(' or ')})`;
    }
    return;
  }
  if (!OFFER_TYPES.includes(type)) {
    errors[name('offer_type')] = `offer_type must be ${OFFER_TYPES.join(' or ')}`;
    return;
  }
  const value = item.offer_value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors[name('offer_value')] = type === 'price' ? 'Offer price is required' : 'Offer percentage is required';
  } else if (!hasTwoDecimals(value)) {
    errors[name('offer_value')] = 'Offer can have at most 2 decimal places';
  } else if (type === 'price' && (value < 0 || (typeof item.price === 'number' && value >= item.price))) {
    errors[name('offer_value')] = 'Offer price must be less than the price';
  } else if (type === 'percentage' && (value <= 0 || value >= 100)) {
    errors[name('offer_value')] = 'Offer percentage must be more than 0 and less than 100';
  }
}

// PUT /products/:id/variants — the whole list of combinations:
// [{ id?, values: [attributeValueId, ...], price, sku?, is_active? }]
function variants(body) {
  const errors = {};
  if (!required(body, 'variants', errors, 'send [] to remove all')) return errors;
  const list = body.variants;
  if (!Array.isArray(list)) {
    errors.variants = 'variants must be a list of { values, price, sku, is_active }';
    return errors;
  }
  if (list.length > MAX_VARIANTS) {
    errors.variants = `At most ${MAX_VARIANTS} combinations are allowed`;
    return errors;
  }
  list.forEach((item, i) => {
    const key = `variants[${i}]`;
    if (!item || typeof item !== 'object') {
      errors[key] = 'Must be an object with values and price';
      return;
    }
    if (item.id !== undefined && !isPositiveInt(item.id)) errors[`${key}.id`] = 'id must be a combination id';
    if (!Array.isArray(item.values) || !item.values.length || !item.values.every(isPositiveInt)) {
      errors[`${key}.values`] = 'Select at least one attribute value';
    } else if (new Set(item.values).size !== item.values.length) {
      errors[`${key}.values`] = 'The same value is selected twice';
    }
    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 || item.price > MAX_PRICE) {
      errors[`${key}.price`] = 'Price is required (a number, 0 or more)';
    } else if (Math.round(item.price * 100) !== item.price * 100) {
      errors[`${key}.price`] = 'Price can have at most 2 decimal places';
    }
    offerErrors(item, key, errors);
    if (!isOptionalText(item.sku) || (typeof item.sku === 'string' && item.sku.trim().length > 100)) {
      errors[`${key}.sku`] = 'SKU must be text of at most 100 characters';
    }
    if (item.is_active !== undefined && typeof item.is_active !== 'boolean') {
      errors[`${key}.is_active`] = 'is_active must be true or false';
    }
  });
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = {
  variants,
  MIN_IMAGES,
  MAX_IMAGES,
  MAX_BENEFITS,
  FIELDS,
  isGalleryField,
  isBenefitImageField,
  normalize,
  create,
  basic,
  benefits,
  specifications,
  packageDetails,
  boxContents,
  status,
};
