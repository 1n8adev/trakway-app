// Request validators for service bookings (admin), used with middlewares/validate.
const { STATUSES, values } = require('../../../constants/serviceBooking');
const { toIntOrNull } = require('../../../utils/formData');

const STATUS_VALUES = values(STATUSES);
const FIELDS = ['status', 'technician_id', 'admin_notes'];
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// Middleware: trims strings; admin_notes "" -> null; technician_id "3" -> 3, "" / "null" -> null (unassign).
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['status', 'admin_notes']) {
    if (typeof body[key] === 'string') body[key] = body[key].trim();
  }
  if (body.admin_notes === '') body.admin_notes = null;
  if (body.technician_id !== undefined) body.technician_id = toIntOrNull(body.technician_id);
  req.body = body;
  next();
}

function fieldErrors(body) {
  const errors = {};
  if (body.status !== undefined && !STATUS_VALUES.includes(body.status)) {
    errors.status = `status must be ${STATUS_VALUES.join(', ')}`;
  }
  if (body.technician_id !== undefined && body.technician_id !== null && !isPositiveInt(body.technician_id)) {
    errors.technician_id = 'technician_id must be a technician id (or null to unassign)';
  }
  if (body.admin_notes !== undefined && body.admin_notes !== null
    && (typeof body.admin_notes !== 'string' || body.admin_notes.length > 5000)) {
    errors.admin_notes = 'admin_notes must be text of at most 5000 characters';
  }
  return errors;
}

// PATCH /:id/status — { status, technician_id?, admin_notes? }
function status(body) {
  const errors = fieldErrors(body);
  if (body.status === undefined) errors.status = `status is required (${STATUS_VALUES.join(', ')})`;
  return errors;
}

// PATCH /:id/assign — { technician_id, admin_notes? }
function assign(body) {
  const errors = fieldErrors(body);
  if (!isPositiveInt(body.technician_id)) errors.technician_id = 'Select a technician';
  return errors;
}

// PATCH /:id — any of { status, technician_id, admin_notes }
function update(body) {
  const errors = fieldErrors(body);
  if (!FIELDS.some((key) => body[key] !== undefined)) {
    errors.body = `Provide at least one of: ${FIELDS.join(', ')}`;
  }
  return errors;
}

module.exports = { FIELDS, normalize, status, assign, update };
