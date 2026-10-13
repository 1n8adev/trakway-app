// Request validators for admin auth, used with middlewares/validate.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function login(body) {
  const errors = {};
  if (typeof body.email !== 'string' || !body.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(body.email.trim())) {
    errors.email = 'Email is invalid';
  }
  if (typeof body.password !== 'string' || !body.password) {
    errors.password = 'Password is required';
  }
  return errors;
}

module.exports = { login };
