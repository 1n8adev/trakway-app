// Request validators for categories, used with middlewares/validate.
const { toIntOrNull, toInt, toBool, toStringOrNull } = require('../../../utils/formData');

// Middleware: converts form-data strings to real types and puts an uploaded
// image's path in body.image. Runs before validate(); JSON bodies pass through unchanged.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.parent_id !== undefined) body.parent_id = toIntOrNull(body.parent_id);
  if (body.sort_order !== undefined) body.sort_order = toInt(body.sort_order);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  if (body.description !== undefined) body.description = toStringOrNull(body.description);
  if (body.image !== undefined) body.image = toStringOrNull(body.image);
  if (req.file) body.image = req.file.publicPath;
  req.body = body;
  next();
}

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// Shared field rules; `partial` skips the required check on name (for updates).
function categoryFields(body, { partial }) {
  const errors = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.name = 'Name is required';
    } else if (body.name.trim().length > 150) {
      errors.name = 'Name must be at most 150 characters';
    }
  }
  if (body.slug !== undefined && (typeof body.slug !== 'string' || !body.slug.trim() || body.slug.length > 180)) {
    errors.slug = 'Slug must be a non-empty string of at most 180 characters';
  }
  if (body.parent_id !== undefined && body.parent_id !== null && !isPositiveInt(body.parent_id)) {
    errors.parent_id = 'parent_id must be a category id or null';
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    errors.description = 'Description must be a string';
  }
  if (body.image !== undefined && body.image !== null && (typeof body.image !== 'string' || body.image.length > 500)) {
    errors.image = 'Image must be a URL/path of at most 500 characters';
  }
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    errors.sort_order = 'sort_order must be an integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }

  return errors;
}

const create = (body) => categoryFields(body, { partial: false });

function update(body) {
  const errors = categoryFields(body, { partial: true });
  const known = ['parent_id', 'name', 'slug', 'description', 'image', 'sort_order', 'is_active'];
  if (!known.some((key) => body[key] !== undefined)) {
    errors.body = `Provide at least one of: ${known.join(', ')}`;
  }
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { normalize, create, update, status };
