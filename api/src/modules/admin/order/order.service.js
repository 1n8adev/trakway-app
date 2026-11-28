// Business logic for orders (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const paymentService = require('../../payment/payment.service');
const orderRepository = require('./order.repository');

const STATUSES = ['pending_payment', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];

// Allowed next statuses. Delivered and cancelled are final. pending_payment = online order not paid yet;
// it becomes placed only through a verified Razorpay payment.
const NEXT = {
  pending_payment: ['cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Nests the customer: customer: { id, name, email, phone }.
function format({ user_id: id, customer_name: name, customer_email: email, customer_phone: phone, ...order }) {
  return { ...order, customer: { id, name, email, phone }, next_statuses: NEXT[order.status] };
}

async function getOrFail(id) {
  const order = await orderRepository.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

async function list(filters, pagination) {
  const { items, total } = await orderRepository.findAll(filters, pagination);
  return { items: items.map(format), total };
}

// { all, placed, confirmed, shipped, delivered, cancelled }
async function summary() {
  const counts = Object.fromEntries([['all', 0], ...STATUSES.map((s) => [s, 0])]);
  for (const row of await orderRepository.countByStatus()) {
    counts[row.status] = row.total;
    counts.all += row.total;
  }
  return counts;
}

async function getById(id) {
  const order = await getOrFail(id);
  const [items, payments] = await Promise.all([
    orderRepository.findItems(id),
    order.payment_method === 'razorpay' ? paymentService.listPayments(id) : [],
  ]);
  const refundable = order.payment_method === 'razorpay' && order.status === 'cancelled' && order.payment_status === 'paid';
  return { ...format(order), items, payments, can_refund: refundable };
}

// Starts the refund of a cancelled, paid online order. Returns the order (+ refund_error if Razorpay refused).
async function refundAfterCancel(id, reason) {
  try {
    await paymentService.refundOrder(id, reason);
    return getById(id);
  } catch (err) {
    return { ...(await getById(id)), refund_error: `Order cancelled, but the refund failed: ${err.message}. Use "Refund" to retry.` };
  }
}

// Moves the order to its next status. Cash on Delivery: delivered = paid; cancelled = payment cancelled.
// Razorpay: a paid order that is cancelled is refunded in full; an unpaid one is checked with Razorpay first.
async function setStatus(id, { status, admin_notes: notes, cancel_reason: reason }) {
  const order = await getOrFail(id);
  if (order.status === 'pending_payment' && status === 'cancelled') {
    if (notes !== undefined) await orderRepository.update(id, { admin_notes: notes }, order.status);
    if (await paymentService.cancelUnpaid(id, reason || 'Cancelled by admin')) return getById(id);
    throw ApiError.conflict('The customer has just paid for this order. Refresh to see it as placed.');
  }
  if (order.status === status) throw ApiError.badRequest(`Order is already ${status}`);
  if (!NEXT[order.status].includes(status)) {
    throw ApiError.badRequest(
      NEXT[order.status].length
        ? `A ${order.status} order can only be moved to: ${NEXT[order.status].join(', ')}`
        : `A ${order.status} order can't be changed`,
      { status: 'Not allowed from the current status' },
    );
  }
  const now = new Date();
  const changes = { status, ...(notes !== undefined && { admin_notes: notes }) };
  if (status === 'confirmed') changes.confirmed_at = now;
  if (status === 'shipped') changes.shipped_at = now;
  const paidOnline = order.payment_method === 'razorpay' && order.payment_status === 'paid';
  if (status === 'delivered') {
    changes.delivered_at = now;
    if (order.payment_method === 'cod') changes.payment_status = 'paid';
  }
  if (status === 'cancelled') {
    // A paid online order stays 'paid' until its refund is started (then 'refunded').
    Object.assign(changes, { cancelled_at: now, cancel_reason: reason || 'Cancelled by admin', ...(!paidOnline && { payment_status: 'cancelled' }) });
  }
  if (!(await orderRepository.update(id, changes, order.status))) {
    throw ApiError.conflict('This order was just updated by someone else. Please refresh and try again.');
  }
  if (status === 'cancelled' && paidOnline) return refundAfterCancel(id, changes.cancel_reason);
  return getById(id);
}

// Retries the refund of a cancelled order that is still marked paid.
async function refund(id) {
  const order = await getOrFail(id);
  if (!(order.payment_method === 'razorpay' && order.status === 'cancelled' && order.payment_status === 'paid')) {
    throw ApiError.badRequest('Only cancelled orders paid online can be refunded');
  }
  await paymentService.refundOrder(id, order.cancel_reason || 'Order cancelled');
  return getById(id);
}

// Re-reads the order's payments from Razorpay (e.g. the customer says they paid but the order shows unpaid).
async function syncPayment(id) {
  const order = await getOrFail(id);
  if (order.payment_method !== 'razorpay') throw ApiError.badRequest('This order is Cash on Delivery');
  await paymentService.syncOrder(id);
  return getById(id);
}

async function updateNotes(id, notes) {
  const order = await getOrFail(id);
  await orderRepository.update(id, { admin_notes: notes }, order.status);
  return getById(id);
}

module.exports = { STATUSES, PAYMENT_STATUSES, list, summary, getById, setStatus, updateNotes, refund, syncPayment };
