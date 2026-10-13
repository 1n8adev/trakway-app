// Business logic for the customer cart. Throws ApiError on rule violations.
// Prices are always current: each read re-prices lines from the product / combination.
const ApiError = require('../../../utils/ApiError');
const { pricing } = require('../../../utils/pricing');
const { round2 } = require('../../../utils/money');
const cartRepository = require('./cart.repository');

const MAX_QUANTITY = 10;

// Prices one cart row and says whether it can be bought right now.
function formatLine(row) {
  const usesVariant = row.variant_id !== null;
  let message = null;
  if (!row.product_visible) message = 'This product is no longer available';
  else if (usesVariant && !row.variant_sellable) message = 'This option is no longer available';
  else if (!usesVariant && row.has_variants) message = 'Please choose an option for this product';
  else if (!usesVariant && row.product_price === null) message = 'This product is not available for purchase';

  const source = usesVariant
    ? { price: row.variant_price, offer_type: row.variant_offer_type, offer_value: row.variant_offer_value }
    : { price: row.product_price, offer_type: row.product_offer_type, offer_value: row.product_offer_value };
  const available = message === null;
  const { final_price: finalPrice } = pricing(source);

  return {
    id: row.id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    name: row.name,
    slug: row.slug,
    image: row.image,
    variant_label: row.variant_label,
    sku: row.sku,
    quantity: row.quantity,
    price: available ? source.price : null,
    final_price: available ? finalPrice : null,
    line_mrp: available ? round2(source.price * row.quantity) : 0,
    line_total: available ? round2(finalPrice * row.quantity) : 0,
    available,
    message,
  };
}

// Cart with totals. Unavailable lines are listed but not counted.
function summarize(items) {
  const usable = items.filter((item) => item.available);
  const mrpTotal = round2(usable.reduce((sum, item) => sum + item.line_mrp, 0));
  const subtotal = round2(usable.reduce((sum, item) => sum + item.line_total, 0));
  return {
    items,
    summary: {
      items_count: usable.length,
      quantity_total: usable.reduce((sum, item) => sum + item.quantity, 0),
      mrp_total: mrpTotal,
      subtotal,
      savings: round2(mrpTotal - subtotal),
      unavailable_count: items.length - usable.length,
    },
  };
}

// Used by checkout too (inside its transaction, with lock).
async function load(userId, options) {
  return summarize((await cartRepository.findLines(userId, options)).map(formatLine));
}

const get = (userId) => load(userId);

// Products with combinations need variant_id (one of its sellable combinations);
// products without need their own price and no variant_id.
async function add(userId, { product_id: productId, variant_id: variantId = null, quantity = 1 }) {
  const product = await cartRepository.findPurchasable(productId, variantId);
  if (!product || !product.visible) throw ApiError.notFound('Product not found');
  if (product.has_variants && variantId === null) {
    throw ApiError.badRequest('Validation failed', { variant_id: 'Please choose an option' });
  }
  if (!product.has_variants && variantId !== null) {
    throw ApiError.badRequest('Validation failed', { variant_id: 'This product has no options' });
  }
  if (variantId !== null && !product.variant_sellable) {
    throw ApiError.badRequest('Validation failed', { variant_id: 'This option is not available' });
  }
  if (variantId === null && product.price === null) {
    throw ApiError.badRequest('This product is not available for purchase');
  }
  await cartRepository.addQuantity(userId, productId, variantId, quantity, MAX_QUANTITY);
  return get(userId);
}

async function getLineOrFail(userId, id) {
  const line = await cartRepository.findLine(userId, id);
  if (!line) throw ApiError.notFound('Cart item not found');
  return line;
}

async function setQuantity(userId, id, quantity) {
  await getLineOrFail(userId, id);
  await cartRepository.setQuantity(id, quantity);
  return get(userId);
}

async function remove(userId, id) {
  await getLineOrFail(userId, id);
  await cartRepository.removeLine(id);
  return get(userId);
}

async function clear(userId) {
  await cartRepository.clear(userId);
  return get(userId);
}

// Empties the cart inside the caller's transaction (after an order is placed).
const clearWith = (userId, client) => cartRepository.clear(userId, client);

module.exports = { MAX_QUANTITY, load, get, add, setQuantity, remove, clear, clearWith };
