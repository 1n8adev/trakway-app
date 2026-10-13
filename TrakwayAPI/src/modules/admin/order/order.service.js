// Business logic for orders (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const orderRepository = require('./order.repository');

const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'];

// Allowed next statuses. Delivered and cancelled are final.
const NEXT = {
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
  return { ...format(order), items: await orderRepository.findItems(id) };
}

// Moves the order to its next status. Cash on Delivery: delivered = paid; cancelled = payment cancelled.
async function setStatus(id, { status, admin_notes: notes, cancel_reason: reason }) {
  const order = await getOrFail(id);
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
  if (status === 'delivered') Object.assign(changes, { delivered_at: now, payment_status: 'paid' });
  if (status === 'cancelled') {
    Object.assign(changes, { cancelled_at: now, payment_status: 'cancelled', cancel_reason: reason || 'Cancelled by admin' });
  }
  if (!(await orderRepository.update(id, changes, order.status))) {
    throw ApiError.conflict('This order was just updated by someone else. Please refresh and try again.');
  }
  return getById(id);
}

async function updateNotes(id, notes) {
  const order = await getOrFail(id);
  await orderRepository.update(id, { admin_notes: notes }, order.status);
  return getById(id);
}

module.exports = { STATUSES, PAYMENT_STATUSES, list, summary, getById, setStatus, updateNotes };
