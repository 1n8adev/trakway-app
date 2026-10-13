// Request validators for checkout and customer orders, used with middlewares/validate.
const { toIntOrNull, toBool } = require('../../../utils/formData');

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
// 15-character GSTIN: 2-digit state code, PAN, entity number, "Z", checksum.
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const toId = (value) => (value === undefined ? undefined : toIntOrNull(value === null ? '' : String(value)));

// Trims text; coupon_code / GSTIN upper-case ("" -> none); ids "3" -> 3 ("" -> not given).
// billing_same_as_shipping: true wins over billing_address_id (the checkbox on the checkout page).
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['coupon_code', 'note', 'reason', 'payment_method', 'billing_company_name', 'billing_gstin']) {
    if (typeof body[key] !== 'string') continue;
    body[key] = body[key].trim();
    // Empty form fields often arrive as the text "undefined" / "null" (FormData.append(key, undefined)).
    if (['undefined', 'null'].includes(body[key].toLowerCase())) body[key] = '';
  }
  if (typeof body.coupon_code === 'string') body.coupon_code = body.coupon_code.toUpperCase() || null;
  if (typeof body.billing_gstin === 'string') body.billing_gstin = body.billing_gstin.toUpperCase() || null;
  for (const key of ['note', 'billing_company_name']) if (body[key] === '') body[key] = null;
  body.address_id = toId(body.address_id);
  body.billing_address_id = toId(body.billing_address_id);
  if (body.billing_same_as_shipping !== undefined) {
    body.billing_same_as_shipping = toBool(body.billing_same_as_shipping);
    if (body.billing_same_as_shipping === true) body.billing_address_id = null;
  }
  req.body = body;
  next();
}

function couponError(code) {
  if (code === undefined || code === null) return null;
  return typeof code === 'string' && code.length <= 30 ? null : 'Enter a valid coupon code';
}

// POST /checkout/summary — { coupon_code? }
function summary(body) {
  const message = couponError(body.coupon_code);
  return message ? { coupon_code: message } : {};
}

// POST /orders — { address_id?, billing_same_as_shipping?, billing_address_id?, billing_company_name?,
//                  billing_gstin?, coupon_code?, note?, payment_method? ('cod') }
function place(body) {
  const errors = {};
  if (body.address_id !== undefined && body.address_id !== null && !isPositiveInt(body.address_id)) {
    errors.address_id = 'Select a delivery address';
  }
  if (body.billing_address_id !== undefined && body.billing_address_id !== null && !isPositiveInt(body.billing_address_id)) {
    errors.billing_address_id = 'Select a billing address';
  }
  if (body.billing_same_as_shipping !== undefined && typeof body.billing_same_as_shipping !== 'boolean') {
    errors.billing_same_as_shipping = 'billing_same_as_shipping must be true or false';
  }
  if (body.billing_same_as_shipping === false && !body.billing_address_id) {
    errors.billing_address_id = 'Select a billing address';
  }
  const company = body.billing_company_name;
  if (company !== undefined && company !== null && (typeof company !== 'string' || company.length > 150)) {
    errors.billing_company_name = 'Company name must be at most 150 characters';
  }
  const gstin = body.billing_gstin;
  if (gstin !== undefined && gstin !== null) {
    if (typeof gstin !== 'string' || !GSTIN_REGEX.test(gstin)) errors.billing_gstin = 'Enter a valid 15-character GSTIN';
    else if (!company) errors.billing_company_name = 'Company name is required with a GSTIN';
  }
  const coupon = couponError(body.coupon_code);
  if (coupon) errors.coupon_code = coupon;
  if (body.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > 500)) {
    errors.note = 'Note must be at most 500 characters';
  }
  if (body.payment_method !== undefined && body.payment_method !== 'cod') {
    errors.payment_method = 'Only Cash on Delivery (cod) is available';
  }
  return errors;
}

// POST /orders/:orderNo/cancel — { reason? }
function cancel(body) {
  return body.reason !== undefined && body.reason !== null && (typeof body.reason !== 'string' || body.reason.length > 255)
    ? { reason: 'Reason must be at most 255 characters' } : {};
}

module.exports = { normalize, summary, place, cancel };
