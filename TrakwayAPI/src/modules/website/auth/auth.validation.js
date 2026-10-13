// Request validators for website customer auth, used with middlewares/validate.
const { normalizePhone, isMobile } = require('../../../utils/phone');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;

// Middleware: trims text fields (never passwords), lowercases email, normalizes phone ("" -> null).
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  for (const key of ['name', 'email', 'phone', 'otp', 'refresh_token', 'reset_token']) {
    if (typeof body[key] === 'string') body[key] = body[key].trim();
  }
  if (typeof body.email === 'string') body.email = body.email.toLowerCase();
  if (typeof body.otp === 'number') body.otp = String(body.otp);
  if (body.phone === '' || body.phone === null) body.phone = null;
  else if (body.phone !== undefined) body.phone = normalizePhone(body.phone);
  req.body = body;
  next();
}

function emailError(email) {
  if (!email) return 'Email is required';
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email) || email.length > 255) return 'Enter a valid email address';
  return null;
}

// 8–72 characters (bcrypt uses the first 72 bytes) with at least one letter and one number.
function newPasswordError(value) {
  if (typeof value !== 'string' || !value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (Buffer.byteLength(value) > 72) return 'Password is too long';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must contain at least one letter and one number';
  return null;
}

const collect = (checks) => Object.fromEntries(Object.entries(checks).filter(([, message]) => message));

// POST /auth/register — { name, email, phone?, password }
function register(body) {
  return collect({
    name: !body.name || typeof body.name !== 'string' ? 'Name is required'
      : body.name.length > 100 ? 'Name must be at most 100 characters' : null,
    email: emailError(body.email),
    phone: body.phone !== undefined && body.phone !== null && !isMobile(body.phone)
      ? 'Enter a valid 10-digit mobile number' : null,
    password: newPasswordError(body.password),
  });
}

// { email }
const email = (body) => collect({ email: emailError(body.email) });

// { email, otp }
function emailOtp(body) {
  return collect({
    email: emailError(body.email),
    otp: !body.otp ? 'Code is required' : !OTP_REGEX.test(body.otp) ? 'Enter the 6-digit code' : null,
  });
}

// POST /auth/login — { email, password }
function login(body) {
  return collect({
    email: emailError(body.email),
    password: typeof body.password !== 'string' || !body.password ? 'Password is required' : null,
  });
}

// { refresh_token }
const refreshToken = (body) => collect({
  refresh_token: typeof body.refresh_token !== 'string' || !body.refresh_token ? 'refresh_token is required' : null,
});

// POST /auth/reset-password — { reset_token, password }
function resetPassword(body) {
  return collect({
    reset_token: typeof body.reset_token !== 'string' || !body.reset_token ? 'reset_token is required' : null,
    password: newPasswordError(body.password),
  });
}

module.exports = { normalize, register, email, emailOtp, login, refreshToken, resetPassword };
