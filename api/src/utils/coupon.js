// Coupon rules, shared by checkout (website) and coupon admin. Pure functions — callers load the data.
const { round2, formatInr } = require('./money');

// Discount for a subtotal: percentage (capped by max_discount) or fixed, never more than the subtotal.
function couponDiscount(coupon, subtotal) {
  const raw = coupon.discount_type === 'percentage'
    ? subtotal * (coupon.discount_value / 100)
    : coupon.discount_value;
  const capped = coupon.max_discount ? Math.min(raw, coupon.max_discount) : raw;
  return round2(Math.min(capped, subtotal));
}

// Why a coupon can't be used right now, or null if it can.
// usage = { total_used, user_used } (orders that are not cancelled).
function couponProblem(coupon, { subtotal, usage, now = new Date() }) {
  if (!coupon || !coupon.is_active) return 'This coupon code is not valid';
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return 'This coupon is not active yet';
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return 'This coupon has expired';
  if (coupon.usage_limit && usage.total_used >= coupon.usage_limit) return 'This coupon has reached its usage limit';
  if (coupon.per_user_limit && usage.user_used >= coupon.per_user_limit) return 'You have already used this coupon';
  if (subtotal < coupon.min_order_amount) {
    return `Add items worth ${formatInr(round2(coupon.min_order_amount - subtotal))} more to use this coupon`;
  }
  return null;
}

// Short description for customers: "10% off (up to ₹500)" / "₹200 off" + minimum order.
function couponSummary(coupon) {
  const off = coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}% off${coupon.max_discount ? ` (up to ${formatInr(coupon.max_discount)})` : ''}`
    : `${formatInr(coupon.discount_value)} off`;
  return coupon.min_order_amount > 0 ? `${off} on orders of ${formatInr(coupon.min_order_amount)} or more` : off;
}

module.exports = { couponDiscount, couponProblem, couponSummary };
