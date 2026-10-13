// Business logic for coupons (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { couponSummary } = require('../../../utils/coupon');
const couponRepository = require('./coupon.repository');

const fail = (errors) => ApiError.badRequest('Validation failed', errors);

// What the coupon is doing right now: inactive | scheduled | expired | used_up | active.
function state(coupon, now = new Date()) {
  if (!coupon.is_active) return 'inactive';
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return 'scheduled';
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return 'expired';
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return 'used_up';
  return 'active';
}

const format = (coupon) => ({ ...coupon, state: state(coupon), summary: couponSummary(coupon) });

async function getOrFail(id) {
  const coupon = await couponRepository.findById(id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  return coupon;
}

// Rules that involve more than one field, checked on the final values (stored + changes).
function checkCombined(c) {
  const errors = {};
  if (c.discount_type === 'percentage' && c.discount_value > 100) errors.discount_value = 'Percentage cannot be more than 100';
  if (c.discount_type === 'fixed' && c.max_discount !== null && c.max_discount !== undefined) {
    errors.max_discount = 'Max discount applies only to percentage coupons';
  }
  if (c.starts_at && c.expires_at && new Date(c.expires_at) <= new Date(c.starts_at)) {
    errors.expires_at = 'Expiry must be after the start date';
  }
  if (Object.keys(errors).length) throw fail(errors);
}

async function assertCodeFree(code, excludeId = null) {
  if (await couponRepository.codeExists(code, excludeId)) {
    throw ApiError.conflict('This coupon code already exists', { code: 'This coupon code already exists' });
  }
}

function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'coupons_code_unique') {
    return ApiError.conflict('This coupon code already exists', { code: 'This coupon code already exists' });
  }
  return err;
}

async function list(filters, pagination) {
  const { items, total } = await couponRepository.findAll(filters, pagination);
  return { items: items.map(format), total };
}

async function getById(id) {
  return format(await getOrFail(id));
}

async function create(data) {
  const coupon = { min_order_amount: 0, is_active: true, ...data };
  checkCombined(coupon);
  await assertCodeFree(coupon.code);
  const id = await couponRepository.create(coupon).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

async function update(id, data) {
  const existing = await getOrFail(id);
  const changes = { ...data };
  // Switching to a fixed amount drops the percentage cap.
  if (changes.discount_type === 'fixed' && changes.max_discount === undefined) changes.max_discount = null;
  checkCombined({ ...existing, ...changes });
  if (changes.code !== undefined) await assertCodeFree(changes.code, id);
  await couponRepository.update(id, changes).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await couponRepository.update(id, { is_active: isActive });
  return getById(id);
}

// Coupons used in any order are kept for order history — deactivate them instead.
async function remove(id) {
  await getOrFail(id);
  if ((await couponRepository.countOrders(id)) > 0) {
    throw ApiError.conflict('This coupon has been used in orders. Deactivate it instead of deleting.');
  }
  await couponRepository.remove(id);
}

module.exports = { list, getById, create, update, setStatus, remove };
