// Request validators for website customers (admin), used with middlewares/validate.
const { toBool } = require('../../../utils/formData');

function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  req.body = body;
  next();
}

// PATCH /users/:id/status — { is_active }
function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { normalize, status };
