// Request validators for suppliers, used with middlewares/validate.
const INDIAN_STATES = require('../../../constants/indianStates');
const { toBool } = require('../../../utils/formData');
const { normalizePhone, isMobile } = require('../../../utils/phone');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const TEXT_FIELDS = ['name', 'contact_person', 'mobile', 'email', 'gstin', 'address', 'city', 'state', 'pincode', 'notes'];
// Optional fields: "" / null clears them.
const NULLABLE = ['contact_person', 'email', 'gstin', 'notes'];

const LIMITS = { name: 150, contact_person: 100, email: 255, address: 500, city: 60, notes: 1000 };

// Middleware: trims strings, empties optional fields to null, normalizes mobile/email/GSTIN.
function normalize(req, res, next) {
  const body = {};
  for (const [key, value] of Object.entries(req.body || {})) {
    body[key] = typeof value === 'string' ? value.trim() : value;
  }
  for (const key of NULLABLE) if (body[key] === '') body[key] = null;
  if (body.mobile !== undefined) body.mobile = normalizePhone(body.mobile);
  if (typeof body.email === 'string') body.email = body.email.toLowerCase();
  if (typeof body.gstin === 'string') body.gstin = body.gstin.toUpperCase();
  if (typeof body.pincode === 'number') body.pincode = String(body.pincode);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  req.body = body;
  next();
}

function fieldErrors(body, { partial }) {
  const errors = {};
  const need = (key) => !partial || body[key] !== undefined;
  const text = (key, label, required) => {
    const value = body[key];
    if (value === undefined || value === null) {
      if (required && need(key)) errors[key] = `${label} is required`;
      return;
    }
    if (typeof value !== 'string' || (required && !value)) errors[key] = `${label} is required`;
    else if (value.length > LIMITS[key]) errors[key] = `${label} must be at most ${LIMITS[key]} characters`;
  };

  text('name', 'Business name', true);
  text('contact_person', 'Contact person', false);
  text('address', 'Address', true);
  text('city', 'City', true);
  text('notes', 'Notes', false);

  if (need('mobile')) {
    if (!body.mobile) errors.mobile = 'Mobile number is required';
    else if (!isMobile(body.mobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  }
  if (body.email !== undefined && body.email !== null
    && (typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email) || body.email.length > LIMITS.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (body.gstin !== undefined && body.gstin !== null && (typeof body.gstin !== 'string' || !GSTIN_REGEX.test(body.gstin))) {
    errors.gstin = 'Enter a valid 15-character GSTIN';
  }
  if (need('state') && !INDIAN_STATES.includes(body.state)) {
    errors.state = body.state ? 'Select a valid state' : 'State is required';
  }
  if (need('pincode')) {
    if (!body.pincode) errors.pincode = 'Pincode is required';
    else if (typeof body.pincode !== 'string' || !PINCODE_REGEX.test(body.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }
  return errors;
}

// POST /suppliers
const create = (body) => fieldErrors(body, { partial: false });

// PUT /suppliers/:id — any fields.
function update(body) {
  const errors = fieldErrors(body, { partial: true });
  if (![...TEXT_FIELDS, 'is_active'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one field to update';
  }
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { TEXT_FIELDS, normalize, create, update, status };
