// Request validators for vendor invoice types, used with middlewares/validate.

const MAX_NAME = 60;
// Goes before "/<FY>/0001" in the invoice number, so no "/" or spaces.
const PREFIX_REGEX = /^[A-Z0-9-]{1,10}$/;

// Middleware: trims name, uppercases prefix.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (typeof body.name === 'string') body.name = body.name.trim().replace(/\s+/g, ' ');
  if (typeof body.prefix === 'string') body.prefix = body.prefix.trim().toUpperCase();
  req.body = body;
  next();
}

function fields(body, { partial }) {
  const errors = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name) errors.name = 'Name is required';
    else if (body.name.length > MAX_NAME) errors.name = `Name must be at most ${MAX_NAME} characters`;
  }
  if (!partial || body.prefix !== undefined) {
    if (typeof body.prefix !== 'string' || !body.prefix) errors.prefix = 'Prefix is required';
    else if (!PREFIX_REGEX.test(body.prefix)) errors.prefix = 'Prefix: up to 10 letters, digits or "-"';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') errors.is_active = 'is_active must be true or false';
  return errors;
}

// POST — { name, prefix, is_active? }
const create = (body) => fields(body, { partial: false });
// PUT /:id — any of { name, prefix, is_active }
const update = (body) => fields(body, { partial: true });

// PATCH /:id/status — { is_active }
function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { MAX_NAME, normalize, create, update, status };
