// Request validators for client logos, used with middlewares/validate.
const { toInt, toBool } = require('../../../utils/formData');

// Middleware: converts form-data strings to real types and puts an uploaded
// logo's path in body.image. Runs before validate(); JSON bodies pass through unchanged.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.sort_order !== undefined) body.sort_order = toInt(body.sort_order);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  if (req.file) body.image = req.file.publicPath;
  req.body = body;
  next();
}

// Shared field rules; `partial` skips the required checks on name and image (for updates).
function clientLogoFields(body, { partial }) {
  const errors = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Image name is required';
    } else if (body.name.trim().length > 150) {
      errors.name = 'Image name must be at most 150 characters';
    }
  }
  if (body.image !== undefined || !partial) {
    if (typeof body.image !== 'string' || !body.image.trim()) {
      errors.image = 'Logo image is required';
    } else if (body.image.length > 500) {
      errors.image = 'Image must be a URL/path of at most 500 characters';
    }
  }
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    errors.sort_order = 'sort_order must be an integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }

  return errors;
}

const create = (body) => clientLogoFields(body, { partial: false });

function update(body) {
  const errors = clientLogoFields(body, { partial: true });
  const known = ['name', 'image', 'sort_order', 'is_active'];
  if (!known.some((key) => body[key] !== undefined)) {
    errors.body = `Provide at least one of: ${known.join(', ')}`;
  }
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { normalize, create, update, status };
