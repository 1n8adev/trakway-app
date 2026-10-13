// Request validators for customer addresses, used with middlewares/validate.
const INDIAN_STATES = require('../../../constants/indianStates');
const { toBool } = require('../../../utils/formData');
const { normalizePhone, isMobile } = require('../../../utils/phone');

const PINCODE_REGEX = /^[1-9]\d{5}$/;
const TEXT_LIMITS = { name: 100, address_line1: 255, address_line2: 255, landmark: 255, city: 100 };
const REQUIRED = ['name', 'phone', 'address_line1', 'city', 'state', 'pincode'];
const LABELS = {
  name: 'Name', phone: 'Phone number', address_line1: 'Address', city: 'City', state: 'State', pincode: 'Pincode',
};

// Middleware: trims strings, normalizes phone, "" -> null for optional lines.
function normalize(req, res, next) {
  const body = {};
  for (const [key, value] of Object.entries(req.body || {})) {
    body[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (body.phone !== undefined) body.phone = normalizePhone(body.phone);
  if (typeof body.pincode === 'number') body.pincode = String(body.pincode);
  for (const key of ['address_line2', 'landmark']) if (body[key] === '') body[key] = null;
  if (body.is_default !== undefined) body.is_default = toBool(body.is_default);
  req.body = body;
  next();
}

function fieldErrors(body, { partial }) {
  const errors = {};
  for (const key of REQUIRED) {
    if ((!partial || body[key] !== undefined) && (body[key] === undefined || body[key] === null || body[key] === '')) {
      errors[key] = `${LABELS[key]} is required`;
    }
  }
  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const value = body[key];
    if (errors[key] || value === undefined || value === null) continue;
    if (typeof value !== 'string') errors[key] = `${key} must be text`;
    else if (value.length > max) errors[key] = `Must be at most ${max} characters`;
  }
  if (!errors.phone && body.phone !== undefined && !isMobile(body.phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!errors.state && body.state !== undefined && !INDIAN_STATES.includes(body.state)) errors.state = 'Select a valid state';
  if (!errors.pincode && body.pincode !== undefined && !PINCODE_REGEX.test(body.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  if (body.is_default !== undefined && typeof body.is_default !== 'boolean') errors.is_default = 'is_default must be true or false';
  return errors;
}

const create = (body) => fieldErrors(body, { partial: false });

function update(body) {
  const errors = fieldErrors(body, { partial: true });
  if (![...Object.keys(LABELS), 'address_line2', 'landmark', 'is_default'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one field to update';
  }
  return errors;
}

module.exports = { normalize, create, update };
