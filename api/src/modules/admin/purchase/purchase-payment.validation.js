// Request validators for purchase payments, used with middlewares/validate.
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT = 9999999999.99;
const { PAYMENT_METHODS } = require('../vendor-invoice/vendor-invoice.validation');
const LIMITS = { reference: 100, notes: 1000 };

function isDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const trimOrNull = (value) => (typeof value === 'string' ? value.trim() || null : value ?? null);

// Middleware: trims text fields.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['paid_on', 'method', 'reference', 'notes']) {
    if (body[key] !== undefined) body[key] = trimOrNull(body[key]);
  }
  req.body = body;
  next();
}

// { paid_on, amount, method, reference (required), notes? } — same for create and update.
function payment(body) {
  const errors = {};
  if (!isDate(body.paid_on)) errors.paid_on = 'Enter a valid payment date';
  const n = Number(body.amount);
  if (body.amount === '' || body.amount === null || body.amount === undefined || !Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) {
    errors.amount = 'Enter an amount more than 0';
  } else if (!TWO_DECIMALS.test(String(body.amount))) {
    errors.amount = 'At most 2 decimals';
  }
  if (!PAYMENT_METHODS.includes(body.method)) errors.method = 'Select a payment method';
  if (!body.reference) errors.reference = 'Enter the UTR / cheque no';
  else if (typeof body.reference !== 'string' || body.reference.length > LIMITS.reference) errors.reference = `At most ${LIMITS.reference} characters`;
  if (body.notes !== null && body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > LIMITS.notes)) {
    errors.notes = `At most ${LIMITS.notes} characters`;
  }
  return errors;
}

module.exports = { normalize, payment };
