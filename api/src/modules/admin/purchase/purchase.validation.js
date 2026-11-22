// Request validators for purchases, used with middlewares/validate.
const { toBool } = require('../../../utils/formData');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
const MAX_ITEMS = 100;
const MAX_AMOUNT = 9999999999.99;
const MAX_QUANTITY = 99999999.99;
const LIMITS = { bill_no: 50, notes: 1000 };

function isDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isAmount(value, { allowZero, max = MAX_AMOUNT }) {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && (allowZero ? n >= 0 : n > 0) && n <= max && TWO_DECIMALS.test(String(value));
}

const trimOrNull = (value) => (typeof value === 'string' ? value.trim() || null : value ?? null);
const toId = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

// Middleware: parses multipart strings (items JSON), trims text, coerces ids, and moves the uploaded
// file onto body.bill_file / body.bill_file_name.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (typeof body.items === 'string') {
    try {
      body.items = JSON.parse(body.items);
    } catch {
      body.items = 'invalid';
    }
  }
  for (const key of ['bill_no', 'bill_date', 'notes']) {
    if (body[key] !== undefined) body[key] = trimOrNull(body[key]);
  }
  if (typeof body.bill_no === 'string') body.bill_no = body.bill_no.toUpperCase();
  if (body.supplier_id !== undefined) body.supplier_id = toId(body.supplier_id);
  body.remove_bill_file = toBool(body.remove_bill_file) === true;
  if (Array.isArray(body.items)) {
    body.items = body.items.map((item) => ({
      supplier_product_id: toId(item?.supplier_product_id),
      quantity: item?.quantity,
      unit_price: item?.unit_price,
    }));
  }
  delete body.bill_file;
  delete body.bill_file_name;
  if (req.file) {
    body.bill_file = req.file.privatePath;
    body.bill_file_name = req.file.originalname.slice(0, 255);
  }
  req.body = body;
  next();
}

// The whole purchase: { bill_no, bill_date, notes?, items: [{ supplier_product_id, quantity, unit_price }] }.
function purchase(body) {
  const errors = {};
  if (!body.bill_no) errors.bill_no = "Enter the supplier's bill number";
  else if (typeof body.bill_no !== 'string' || body.bill_no.length > LIMITS.bill_no) errors.bill_no = `At most ${LIMITS.bill_no} characters`;
  if (!isDate(body.bill_date)) errors.bill_date = 'Enter a valid bill date';
  if (body.notes !== null && body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > LIMITS.notes)) {
    errors.notes = `Notes must be at most ${LIMITS.notes} characters`;
  }

  if (!Array.isArray(body.items) || !body.items.length) {
    errors.items = 'Add at least one product';
  } else if (body.items.length > MAX_ITEMS) {
    errors.items = `At most ${MAX_ITEMS} lines per purchase`;
  } else {
    const seen = new Set();
    body.items.forEach((item, i) => {
      const at = (field) => `items.${i}.${field}`;
      if (!Number.isInteger(item.supplier_product_id) || item.supplier_product_id <= 0) {
        errors[at('supplier_product_id')] = 'Select a product';
      } else if (seen.has(item.supplier_product_id)) {
        errors[at('supplier_product_id')] = 'This product is already on another line';
      } else {
        seen.add(item.supplier_product_id);
      }
      if (!isAmount(item.quantity, { allowZero: false, max: MAX_QUANTITY })) errors[at('quantity')] = 'Quantity must be more than 0 (up to 2 decimals)';
      if (!isAmount(item.unit_price, { allowZero: true })) errors[at('unit_price')] = 'Enter a rate (0 or more, up to 2 decimals)';
    });
  }
  return errors;
}

// POST — also needs the supplier (fixed after creation).
function create(body) {
  const errors = purchase(body);
  if (!Number.isInteger(body.supplier_id) || body.supplier_id <= 0) errors.supplier_id = 'Select a supplier';
  return errors;
}

// PUT /:id — the supplier can't change; remove_bill_file=true drops the stored bill (a new upload replaces it anyway).
function update(body) {
  const errors = purchase(body);
  if (body.supplier_id !== undefined && body.supplier_id !== null) errors.supplier_id = "The supplier of a purchase can't be changed";
  return errors;
}

module.exports = { normalize, create, update };
