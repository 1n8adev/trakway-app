// Request validators for coupons (admin), used with middlewares/validate.
const { toBool, toIntOrNull } = require('../../../utils/formData');

const CODE_REGEX = /^[A-Z0-9_-]{3,30}$/;
const TYPES = ['percentage', 'fixed'];
const MAX_AMOUNT = 9999999999.99;
const MONEY_FIELDS = ['discount_value', 'max_discount', 'min_order_amount'];
const LIMIT_FIELDS = ['usage_limit', 'per_user_limit'];
const DATE_FIELDS = ['starts_at', 'expires_at'];
const ALL_FIELDS = ['code', 'description', 'discount_type', ...MONEY_FIELDS, ...DATE_FIELDS, ...LIMIT_FIELDS, 'is_active'];

const hasTwoDecimals = (n) => Math.round(n * 100) === n * 100;

// Middleware: code upper-case; numbers/dates from form strings; "" -> null (no cap / no limit / no date).
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (typeof body.code === 'string') body.code = body.code.trim().toUpperCase();
  if (typeof body.description === 'string') body.description = body.description.trim() || null;
  if (typeof body.discount_type === 'string') body.discount_type = body.discount_type.trim().toLowerCase();
  for (const key of MONEY_FIELDS) {
    const v = body[key];
    if (typeof v === 'string') body[key] = v.trim() === '' ? null : (Number.isNaN(Number(v)) ? v : Number(v));
  }
  for (const key of LIMIT_FIELDS) {
    if (body[key] !== undefined && body[key] !== null) body[key] = toIntOrNull(String(body[key]));
  }
  for (const key of DATE_FIELDS) if (body[key] === '') body[key] = null;
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  req.body = body;
  next();
}

function fieldErrors(body, { partial }) {
  const errors = {};
  const need = (key) => !partial || body[key] !== undefined;

  if (need('code') && (typeof body.code !== 'string' || !CODE_REGEX.test(body.code))) {
    errors.code = 'Code must be 3–30 letters, numbers, - or _';
  }
  if (body.description !== undefined && body.description !== null
    && (typeof body.description !== 'string' || body.description.length > 255)) {
    errors.description = 'Description must be at most 255 characters';
  }
  if (need('discount_type') && !TYPES.includes(body.discount_type)) errors.discount_type = 'discount_type must be percentage or fixed';
  if (need('discount_value')) {
    const v = body.discount_value;
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > MAX_AMOUNT) errors.discount_value = 'Discount must be more than 0';
    else if (!hasTwoDecimals(v)) errors.discount_value = 'At most 2 decimal places';
  }
  for (const key of ['max_discount', 'min_order_amount']) {
    const v = body[key];
    if (v === undefined || v === null) continue;
    const min = key === 'max_discount' ? 0.01 : 0;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > MAX_AMOUNT || !hasTwoDecimals(v)) {
      errors[key] = key === 'max_discount' ? 'Max discount must be more than 0' : 'Minimum order must be 0 or more';
    }
  }
  for (const key of DATE_FIELDS) {
    const v = body[key];
    if (v !== undefined && v !== null && (typeof v !== 'string' || Number.isNaN(Date.parse(v)))) {
      errors[key] = 'Enter a valid date/time (e.g. 2026-12-31 or 2026-12-31T23:59:59+05:30)';
    }
  }
  for (const key of LIMIT_FIELDS) {
    const v = body[key];
    if (v !== undefined && v !== null && !(Number.isInteger(v) && v > 0)) errors[key] = 'Must be a whole number of 1 or more';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') errors.is_active = 'is_active must be true or false';
  return errors;
}

// POST /coupons
const create = (body) => fieldErrors(body, { partial: false });

// PUT /coupons/:id — any fields
function update(body) {
  const errors = fieldErrors(body, { partial: true });
  if (!ALL_FIELDS.some((key) => body[key] !== undefined)) errors.body = 'Provide at least one field to update';
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { ALL_FIELDS, normalize, create, update, status };
