// Request validators for vendor invoices, used with middlewares/validate.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;
const HSN_REGEX = /^\d{4,8}$/;

// GST slabs offered in the admin; amounts are calculated per line at its rate.
const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS = ['bank_transfer', 'upi', 'cash', 'cheque', 'other'];
const MAX_ITEMS = 50;
const MAX_AMOUNT = 9999999999.99;
const LIMITS = { description: 500, notes: 1000, terms: 2000, reference: 100 };

// A real calendar date in YYYY-MM-DD.
function isDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Positive / non-negative money-like number with at most 2 decimals (checked on the text).
function isAmount(value, { allowZero }) {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && (allowZero ? n >= 0 : n > 0) && n <= MAX_AMOUNT && TWO_DECIMALS.test(String(value));
}

const trimOrNull = (value) => (typeof value === 'string' ? value.trim() || null : value ?? null);

// Middleware: trims text, empties optional fields to null, and coerces numbers in items.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['invoice_date', 'due_date', 'notes', 'terms', 'paid_on', 'method', 'reference']) {
    if (body[key] !== undefined) body[key] = trimOrNull(body[key]);
  }
  for (const key of ['vendor_id', 'type_id']) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') body[key] = Number(body[key]);
  }
  if (Array.isArray(body.items)) {
    body.items = body.items.map((item) => ({
      product_id: item?.product_id === undefined || item?.product_id === null || item?.product_id === '' ? null : Number(item.product_id),
      variant_id: item?.variant_id === undefined || item?.variant_id === null || item?.variant_id === '' ? null : Number(item.variant_id),
      accessory_id: item?.accessory_id === undefined || item?.accessory_id === null || item?.accessory_id === '' ? null : Number(item.accessory_id),
      description: trimOrNull(item?.description),
      hsn_sac: trimOrNull(item?.hsn_sac),
      quantity: item?.quantity,
      unit_price: item?.unit_price,
      gst_rate: item?.gst_rate === undefined || item?.gst_rate === '' ? undefined : Number(item.gst_rate),
    }));
  }
  req.body = body;
  next();
}

function textError(errors, key, value, label) {
  if (value !== null && value !== undefined && (typeof value !== 'string' || value.length > LIMITS[key])) {
    errors[key] = `${label} must be at most ${LIMITS[key]} characters`;
  }
}

// POST / PUT — the whole invoice: { vendor_id, invoice_date, due_date?, notes?, terms?, items: [...] }.
// Item: { product_id? (+ variant_id when the product has combinations) | accessory_id? (at most one; neither = custom line),
//         description (optional when either is set),
//         hsn_sac?, quantity, unit_price, gst_rate }.
function invoice(body) {
  const errors = {};
  if (!Number.isInteger(body.vendor_id) || body.vendor_id <= 0) errors.vendor_id = 'Select a vendor';
  if (!isDate(body.invoice_date)) errors.invoice_date = 'Enter a valid invoice date';
  if (body.due_date !== null && body.due_date !== undefined) {
    if (!isDate(body.due_date)) errors.due_date = 'Enter a valid due date';
    else if (isDate(body.invoice_date) && body.due_date < body.invoice_date) errors.due_date = 'Due date cannot be before the invoice date';
  }
  textError(errors, 'notes', body.notes, 'Notes');
  textError(errors, 'terms', body.terms, 'Terms');

  if (!Array.isArray(body.items) || !body.items.length) {
    errors.items = 'Add at least one item';
  } else if (body.items.length > MAX_ITEMS) {
    errors.items = `At most ${MAX_ITEMS} items per invoice`;
  } else {
    // Errors per line as items.<index>.<field>, so the admin can mark the exact cell.
    body.items.forEach((item, i) => {
      const at = (field) => `items.${i}.${field}`;
      if (item.product_id !== null && (!Number.isInteger(item.product_id) || item.product_id <= 0)) {
        errors[at('product_id')] = 'Invalid product';
      }
      if (item.accessory_id !== null && (!Number.isInteger(item.accessory_id) || item.accessory_id <= 0)) {
        errors[at('accessory_id')] = 'Invalid accessory';
      }
      if (item.product_id !== null && item.accessory_id !== null) errors[at('accessory_id')] = 'A line is either a product or an accessory';
      if (item.variant_id !== null) {
        if (!Number.isInteger(item.variant_id) || item.variant_id <= 0) errors[at('variant_id')] = 'Invalid combination';
        else if (item.product_id === null) errors[at('variant_id')] = 'Only product lines have a combination';
      }
      if (item.description === null) {
        if (item.product_id === null && item.accessory_id === null) errors[at('description')] = 'Select a product or accessory, or enter a description';
      } else if (typeof item.description !== 'string' || item.description.length > LIMITS.description) {
        errors[at('description')] = `Description must be at most ${LIMITS.description} characters`;
      }
      if (item.hsn_sac !== null && (typeof item.hsn_sac !== 'string' || !HSN_REGEX.test(item.hsn_sac))) {
        errors[at('hsn_sac')] = 'HSN / SAC must be 4 to 8 digits';
      }
      if (!isAmount(item.quantity, { allowZero: false }) || Number(item.quantity) > 99999999.99) {
        errors[at('quantity')] = 'Quantity must be more than 0 (up to 2 decimals)';
      }
      if (!isAmount(item.unit_price, { allowZero: true })) errors[at('unit_price')] = 'Enter a rate (0 or more, up to 2 decimals)';
      if (!GST_RATES.includes(item.gst_rate)) errors[at('gst_rate')] = `GST must be one of ${GST_RATES.join(', ')}%`;
    });
  }
  return errors;
}

// POST / — the invoice plus its type_id (fixed after creation; PUT ignores it).
function create(body) {
  const errors = invoice(body);
  if (!Number.isInteger(body.type_id) || body.type_id <= 0) errors.type_id = 'Select an invoice type';
  return errors;
}

// POST /:id/payments — { paid_on, amount, method, reference? }
function payment(body) {
  const errors = {};
  if (!isDate(body.paid_on)) errors.paid_on = 'Enter a valid payment date';
  if (!isAmount(body.amount, { allowZero: false })) errors.amount = 'Enter an amount more than 0 (up to 2 decimals)';
  if (!PAYMENT_METHODS.includes(body.method)) errors.method = 'Select a payment method';
  textError(errors, 'reference', body.reference, 'Reference');
  return errors;
}

module.exports = { GST_RATES, PAYMENT_METHODS, normalize, invoice, create, payment };
