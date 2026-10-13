// Request validators for the customer cart, used with middlewares/validate.
const { toInt, toIntOrNull } = require('../../../utils/formData');

const MAX_QUANTITY = 10; // keep in sync with cart.service.js
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.product_id !== undefined) body.product_id = toInt(String(body.product_id));
  if (body.variant_id !== undefined) body.variant_id = toIntOrNull(body.variant_id === null ? '' : String(body.variant_id));
  if (body.quantity !== undefined) body.quantity = toInt(String(body.quantity));
  req.body = body;
  next();
}

const quantityError = (quantity) => (Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
  ? null : `Quantity must be between 1 and ${MAX_QUANTITY}`);

// POST /cart/items — { product_id, variant_id?, quantity? (default 1) }
function add(body) {
  const errors = {};
  if (!isPositiveInt(body.product_id)) errors.product_id = 'product_id is required';
  if (body.variant_id !== undefined && body.variant_id !== null && !isPositiveInt(body.variant_id)) {
    errors.variant_id = 'variant_id must be a combination id';
  }
  if (body.quantity !== undefined && quantityError(body.quantity)) errors.quantity = quantityError(body.quantity);
  return errors;
}

// PATCH /cart/items/:id — { quantity }
function update(body) {
  const message = quantityError(body.quantity);
  return message ? { quantity: message } : {};
}

module.exports = { normalize, add, update };
