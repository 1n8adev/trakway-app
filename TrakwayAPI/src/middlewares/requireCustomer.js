const ApiError = require('../utils/ApiError');
const { authenticate, authorize } = require('./auth');
const authRepository = require('../modules/website/auth/auth.repository');

// Customer-only routes (cart, addresses, orders): valid customer JWT, and the account must still be
// active and verified — so blocking a user takes effect immediately, not when the token expires.
// Sets req.customer = { id, name, email, phone }.
async function loadCustomer(req, res, next) {
  try {
    const user = await authRepository.findUserById(req.user.id);
    if (!user || !user.is_active || !user.email_verified_at) {
      return next(ApiError.unauthorized('Session expired. Please log in again.'));
    }
    req.customer = { id: user.id, name: user.name, email: user.email, phone: user.phone };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = [authenticate, authorize('customer'), loadCustomer];
