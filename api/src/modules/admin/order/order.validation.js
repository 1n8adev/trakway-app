// Request validators for orders (admin), used with middlewares/validate.
const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['status', 'admin_notes', 'cancel_reason']) {
    if (typeof body[key] === 'string') body[key] = body[key].trim();
  }
  if (body.admin_notes === '') body.admin_notes = null;
  if (body.cancel_reason === '') body.cancel_reason = null;
  req.body = body;
  next();
}

const notesError = (value) => (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 5000)
  ? 'admin_notes must be at most 5000 characters' : null);

// PATCH /orders/:id/status — { status, admin_notes?, cancel_reason? }
function status(body) {
  const errors = {};
  if (!STATUSES.includes(body.status)) errors.status = `status must be ${STATUSES.join(', ')}`;
  if (notesError(body.admin_notes)) errors.admin_notes = notesError(body.admin_notes);
  if (body.cancel_reason !== undefined && body.cancel_reason !== null
    && (typeof body.cancel_reason !== 'string' || body.cancel_reason.length > 255)) {
    errors.cancel_reason = 'cancel_reason must be at most 255 characters';
  }
  return errors;
}

// PATCH /orders/:id — { admin_notes }
function update(body) {
  if (body.admin_notes === undefined) return { admin_notes: 'admin_notes is required (empty to clear)' };
  const message = notesError(body.admin_notes);
  return message ? { admin_notes: message } : {};
}

module.exports = { normalize, status, update };
