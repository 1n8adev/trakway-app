// Request validators for supplier products, used with middlewares/validate.
const { GST_RATES } = require('../vendor-invoice/vendor-invoice.validation');

const MAX_NAME = 150;
const MAX_PRICE = 9999999999.99;
const HSN_REGEX = /^\d{4,8}$/;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

// Middleware: trims text, coerces supplier_id / gst_rate to numbers.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (typeof body.name === 'string') body.name = body.name.trim().replace(/\s+/g, ' ');
  if (typeof body.hsn_code === 'string') body.hsn_code = body.hsn_code.trim();
  for (const key of ['supplier_id', 'gst_rate']) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') body[key] = Number(body[key]);
  }
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
  return errors;
}

// POST — { supplier_id, name, price, hsn_code, gst_rate, is_active? }
function create(body) {
  const errors = fields(body, { partial: false });
  if (!Number.isInteger(body.supplier_id) || body.supplier_id <= 0) errors.supplier_id = 'Select a supplier';
  return errors;
}

// PUT /:id — any of name, price, hsn_code, gst_rate, is_active. The supplier can't change.
function update(body) {
  const errors = fields(body, { partial: true });
  if (body.supplier_id !== undefined) errors.supplier_id = "The supplier of a product can't be changed";
  return errors;
}

// PATCH /:id/status — { is_active }
const status = (body) => (typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' });

module.exports = { MAX_NAME, normalize, create, update, status };
