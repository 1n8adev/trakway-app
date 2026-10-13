const ApiError = require('../utils/ApiError');
const jwt = require('../utils/jwt');

// Requires a valid "Authorization: Bearer <token>" header; sets req.user.
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Access token missing'));
  }
  try {
    req.user = jwt.verify(token);
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

// Restricts a route to tokens carrying one of the given types (e.g. 'admin', 'customer').
const authorize = (...types) => (req, res, next) => {
  if (!req.user || !types.includes(req.user.type)) {
    return next(ApiError.forbidden());
  }
  return next();
};

module.exports = { authenticate, authorize };
