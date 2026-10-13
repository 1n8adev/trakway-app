// Request validators for attributes and values, used with middlewares/validate.
const { toInt, toBool, toList } = require('../../../utils/formData');

const MAX_VALUES = 100;

// Middleware: converts form-data / urlencoded strings to real types. JSON passes through.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.sort_order !== undefined) body.sort_order = toInt(body.sort_order);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  if (body.values !== undefined) body.values = toList(body.values);
  req.body = body;
  next();
}

function textError(value, label, max) {
  if (typeof value !== 'string' || !value.trim()) return `${label} is required`;
  if (value.trim().length > max) return `${label} must be at most ${max} characters`;
  return null;
}

function commonErrors(body, errors) {
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    errors.sort_order = 'sort_order must be an integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }
}

// POST /attributes — { name, values?: ["Vodafone Sim", "Airtel Sim"], sort_order?, is_active? }
function create(body) {
  const errors = {};
  const nameError = textError(body.name, 'Name', 100);
  if (nameError) errors.name = nameError;
  if (body.values !== undefined) {
    if (!Array.isArray(body.values) || body.values.some((v) => textError(v, 'Value', 100))) {
      errors.values = 'values must be a list of texts (each at most 100 characters)';
    } else if (body.values.length > MAX_VALUES) {
      errors.values = `At most ${MAX_VALUES} values are allowed`;
    }
  }
  commonErrors(body, errors);
  return errors;
}

// PUT /attributes/:id — any of { name, sort_order, is_active }
function update(body) {
  const errors = {};
  if (body.name !== undefined) {
    const nameError = textError(body.name, 'Name', 100);
    if (nameError) errors.name = nameError;
  }
  commonErrors(body, errors);
  if (!['name', 'sort_order', 'is_active'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one of: name, sort_order, is_active';
  }
  return errors;
}

// POST /attributes/:id/values — { value, sort_order?, is_active? }
function createValue(body) {
  const errors = {};
  const valueError = textError(body.value, 'Value', 100);
  if (valueError) errors.value = valueError;
  commonErrors(body, errors);
  return errors;
}

// PUT /attributes/:id/values/:valueId — any of { value, sort_order, is_active }
function updateValue(body) {
  const errors = {};
  if (body.value !== undefined) {
    const valueError = textError(body.value, 'Value', 100);
    if (valueError) errors.value = valueError;
  }
  commonErrors(body, errors);
  if (!['value', 'sort_order', 'is_active'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one of: value, sort_order, is_active';
  }
  return errors;
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { normalize, create, update, createValue, updateValue, status };
