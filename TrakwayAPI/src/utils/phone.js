// Indian mobile numbers.
const MOBILE_REGEX = /^[6-9]\d{9}$/;

// "+91 98765 43210", "098765-43210", "919876543210" -> "9876543210". Non-strings pass through.
function normalizePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  let digits = String(value).replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const isMobile = (value) => typeof value === 'string' && MOBILE_REGEX.test(value);

module.exports = { normalizePhone, isMobile };
