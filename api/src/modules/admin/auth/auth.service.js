// Business logic for admin auth. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const jwt = require('../../../utils/jwt');
const password = require('../../../utils/password');
const env = require('../../../config/env');
const authRepository = require('./auth.repository');

// Same message for unknown email and wrong password, so emails can't be probed.
const INVALID_CREDENTIALS = 'Invalid email or password';

async function login(email, plainPassword) {
  const admin = await authRepository.findByEmail(email);
  if (!admin || !(await password.compare(plainPassword, admin.password_hash))) {
    throw ApiError.unauthorized(INVALID_CREDENTIALS);
  }
  if (!admin.is_active) {
    throw ApiError.forbidden('Account is disabled');
  }

  await authRepository.updateLastLogin(admin.id);

  const token = jwt.sign({ id: admin.id, email: admin.email, type: 'admin' });
  return {
    token,
    expiresIn: env.jwt.expiresIn
  };
}

async function getProfile(id) {
  const admin = await authRepository.findById(id);
  if (!admin || !admin.is_active) {
    throw ApiError.unauthorized('Account not found or disabled');
  }
  return admin;
}

module.exports = { login, getProfile };
