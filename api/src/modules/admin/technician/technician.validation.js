// Request validators for technicians, used with middlewares/validate.
const ApiError = require('../../../utils/ApiError');
const INDIAN_STATES = require('../../../constants/indianStates');
const { toBool } = require('../../../utils/formData');
const { normalizePhone, isMobile } = require('../../../utils/phone');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

// One image per field. id_proof_photo is stored privately (see technician.routes.js).
const PHOTO_FIELDS = ['technician_photo', 'shop_photo', 'id_proof_photo'];
const PRIVATE_PHOTO_FIELDS = ['id_proof_photo'];
const TEXT_FIELDS = ['name', 'mobile', 'email', 'address', 'state', 'pincode'];
const MAX_PHOTO_MB = 5;

const isPhotoField = (name) => PHOTO_FIELDS.includes(name);

// Middleware: trims strings, normalizes mobile/email, and puts each uploaded photo's path in the body.
// Photo paths are never accepted from the client — only uploaded files.
function normalize(req, res, next) {
  const body = {};
  for (const [key, value] of Object.entries(req.body || {})) {
    if (PHOTO_FIELDS.includes(key)) continue;
    body[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (body.mobile !== undefined) body.mobile = normalizePhone(body.mobile);
  if (body.email === '' || body.email === null) body.email = null;
  else if (typeof body.email === 'string') body.email = body.email.toLowerCase();
  if (typeof body.pincode === 'number') body.pincode = String(body.pincode);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);

  for (const file of req.files || []) {
    if (body[file.fieldname] !== undefined) {
      return next(ApiError.badRequest('Validation failed', { [file.fieldname]: 'Upload only one photo' }));
    }
    body[file.fieldname] = file.privatePath || file.publicPath;
  }
  req.body = body;
  return next();
}

function fieldErrors(body, { partial }) {
  const errors = {};
  const need = (key) => !partial || body[key] !== undefined;

  if (need('name')) {
    if (typeof body.name !== 'string' || !body.name) errors.name = 'Name is required';
    else if (body.name.length > 100) errors.name = 'Name must be at most 100 characters';
  }
  if (need('mobile')) {
    if (!body.mobile) errors.mobile = 'Mobile number is required';
    else if (!isMobile(body.mobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  }
  if (body.email !== undefined && body.email !== null
    && (typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email) || body.email.length > 255)) {
    errors.email = 'Enter a valid email address';
  }
  if (need('address')) {
    if (typeof body.address !== 'string' || !body.address) errors.address = 'Address is required';
    else if (body.address.length > 500) errors.address = 'Address must be at most 500 characters';
  }
  if (need('state') && !INDIAN_STATES.includes(body.state)) {
    errors.state = body.state ? 'Select a valid state' : 'State is required';
  }
  if (need('pincode')) {
    if (!body.pincode) errors.pincode = 'Pincode is required';
    else if (typeof body.pincode !== 'string' || !PINCODE_REGEX.test(body.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  }
  if (!partial) {
    if (!body.technician_photo) errors.technician_photo = 'Technician photo is required';
    if (!body.shop_photo) errors.shop_photo = 'Shop photo is required';
    if (!body.id_proof_photo) errors.id_proof_photo = 'ID proof photo is required';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }
  return errors;
}

// POST /technicians — all fields + 3 photos.
const create = (body) => fieldErrors(body, { partial: false });

// PUT /technicians/:id — any fields; a sent photo replaces the old one.
function update(body) {
  const errors = fieldErrors(body, { partial: true });
  if (![...TEXT_FIELDS, ...PHOTO_FIELDS, 'is_active'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one field or photo to update';
  }
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = {
  PHOTO_FIELDS,
  PRIVATE_PHOTO_FIELDS,
  TEXT_FIELDS,
  MAX_PHOTO_MB,
  isPhotoField,
  normalize,
  create,
  update,
  status,
};
