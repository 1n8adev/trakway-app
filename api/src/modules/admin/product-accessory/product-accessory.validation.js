// Request validators for product accessories, used with middlewares/validate.
const { GST_RATES } = require('../vendor-invoice/vendor-invoice.validation');

const MAX_NAME = 150;
const MAX_SUPPLIER_PRODUCTS = 100;
const MAX_PRICE = 9999999999.99;
const HSN_REGEX = /^\d{4,8}$/;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

// Middleware: trims text, coerces gst_rate to a number.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (typeof body.name === 'string') body.name = body.name.trim().replace(/\s+/g, ' ');
  if (typeof body.hsn_code === 'string') body.hsn_code = body.hsn_code.trim();
  if (body.gst_rate !== undefined && body.gst_rate !== null && body.gst_rate !== '') body.gst_rate = Number(body.gst_rate);
  if (Array.isArray(body.supplier_product_ids)) body.supplier_product_ids = body.supplier_product_ids.map(Number);
  req.body = body;
  next();
}

function fields(body, { partial }) {
  const errors = {};
  const need = (key) => !partial || body[key] !== undefined;
  if (need('name')) {
    if (typeof body.name !== 'string' || !body.name) errors.name = 'Name is required';
    else if (body.name.length > MAX_NAME) errors.name = `Name must be at most ${MAX_NAME} characters`;
  }
  if (need('price')) {
    const n = Number(body.price);
    const ok = body.price !== '' && body.price !== null && Number.isFinite(n) && n >= 0 && n <= MAX_PRICE && TWO_DECIMALS.test(String(body.price));
    if (!ok) errors.price = 'Enter a price (0 or more, up to 2 decimals)';
  }
  if (need('hsn_code') && (typeof body.hsn_code !== 'string' || !HSN_REGEX.test(body.hsn_code))) {
    errors.hsn_code = 'HSN code must be 4 to 8 digits';
  }
  if (need('gst_rate') && !GST_RATES.includes(body.gst_rate)) errors.gst_rate = `GST must be one of ${GST_RATES.join(', ')}%`;
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') errors.is_active = 'is_active must be true or false';
  if (body.supplier_product_ids !== undefined) {
    const ids = body.supplier_product_ids;
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id <= 0)) errors.supplier_product_ids = 'supplier_product_ids must be a list of ids';
    else if (ids.length > MAX_SUPPLIER_PRODUCTS) errors.supplier_product_ids = `At most ${MAX_SUPPLIER_PRODUCTS} supplier products`;
    else if (new Set(ids).size !== ids.length) errors.supplier_product_ids = 'A supplier product is listed twice';
  }
  return errors;
}

// POST — { name, price, hsn_code, gst_rate, is_active?, supplier_product_ids? (the full mapped set) }
const create = (body) => fields(body, { partial: false });
// PUT /:id — any of those fields
const update = (body) => fields(body, { partial: true });

// PATCH /:id/status — { is_active }
const status = (body) => (typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' });

module.exports = { MAX_NAME, normalize, create, update, status };
