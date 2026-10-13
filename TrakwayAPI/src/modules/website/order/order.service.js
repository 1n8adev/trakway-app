// Business logic for checkout (Cash on Delivery) and customer orders. Throws ApiError on rule violations.
const env = require('../../../config/env');
const { withTransaction } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const { round2 } = require('../../../utils/money');
const { couponDiscount, couponProblem, couponSummary } = require('../../../utils/coupon');
const { sendMail } = require('../../../utils/mailer');
const { orderPlacedEmail, newOrderAdminEmail } = require('../../../utils/emailTemplates');
const cartService = require('../cart/cart.service');
const addressRepository = require('../address/address.repository');
const orderRepository = require('./order.repository');

const SHIPPING_FEE = 0; // free shipping across India

const parseOrderNo = (orderNo) => {
  const match = /^ord-?0*(\d+)$/i.exec(String(orderNo).trim());
  return match ? Number(match[1]) : null;
};

// Validates a coupon for this customer + subtotal; throws a coupon_code field error if it can't be used.
async function resolveCoupon(code, userId, subtotal, { client, lock } = {}) {
  const coupon = await orderRepository.findCoupon(code, { client, lock });
  const usage = coupon ? await orderRepository.couponUsage(coupon.id, userId, client) : null;
  const problem = couponProblem(coupon, { subtotal, usage });
  if (problem) throw ApiError.badRequest(problem, { coupon_code: problem });
  return { coupon, discount: couponDiscount(coupon, subtotal) };
}

// Address for checkout: the given one (must be the customer's) or their default.
async function resolveAddress(userId, addressId, client) {
  if (addressId) {
    const address = await addressRepository.findOne(userId, addressId, client);
    if (!address) throw ApiError.badRequest('Validation failed', { address_id: 'Address not found' });
    return address;
  }
  const [defaultAddress] = await addressRepository.findByUser(userId);
  if (!defaultAddress) throw ApiError.badRequest('Please add a delivery address', { address_id: 'Please add a delivery address' });
  return defaultAddress;
}

function assertCartReady(cart) {
  if (!cart.items.length) throw ApiError.badRequest('Your cart is empty');
  const blocked = cart.items.filter((item) => !item.available);
  if (blocked.length) {
    throw ApiError.conflict('Some items in your cart are not available. Please remove them to continue.', {
      items: blocked.map((item) => ({ id: item.id, name: item.name, message: item.message })),
    });
  }
}

// Totals shown on the checkout page (optionally with a coupon). Nothing is saved.
async function summary(userId, { coupon_code: code }) {
  const cart = await cartService.load(userId);
  const { subtotal } = cart.summary;
  let coupon = null;
  let discount = 0;
  if (code && cart.items.length) {
    ({ coupon, discount } = await resolveCoupon(code, userId, subtotal));
  }
  return {
    ...cart,
    coupon: coupon ? { code: coupon.code, discount, description: couponSummary(coupon) } : null,
    totals: {
      mrp_total: cart.summary.mrp_total,
      subtotal,
      coupon_discount: discount,
      shipping_fee: SHIPPING_FEE,
      total: round2(subtotal - discount + SHIPPING_FEE),
      payment_method: 'cod',
    },
  };
}

// Sends the confirmation (and admin copy) without making the customer wait or fail the order.
function sendOrderEmails(order, items, customer) {
  const jobs = [sendMail({ to: customer.email, ...orderPlacedEmail({ order, items, customerName: customer.name }) })];
  if (env.adminOrderEmails.length) {
    jobs.push(sendMail({ to: env.adminOrderEmails.join(','), ...newOrderAdminEmail({ order, items, customer }) }));
  }
  Promise.allSettled(jobs).then((results) => results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error(`Order ${order.order_no} email failed:`, r.reason?.message)));
}

// Places a Cash on Delivery order from the whole cart, then empties the cart.
// Everything runs in one transaction with the cart rows locked, so a double click can't order twice.
// Copies a saved address into order columns with the given prefix ("ship" / "bill").
const addressColumns = (prefix, a) => ({
  [`${prefix}_name`]: a.name,
  [`${prefix}_phone`]: a.phone,
  [`${prefix}_address_line1`]: a.address_line1,
  [`${prefix}_address_line2`]: a.address_line2,
  [`${prefix}_landmark`]: a.landmark,
  [`${prefix}_city`]: a.city,
  [`${prefix}_state`]: a.state,
  [`${prefix}_pincode`]: a.pincode,
});

// Billing address: another saved address of the customer, or the delivery address when not given.
async function resolveBilling(userId, billingAddressId, shipping, client) {
  if (!billingAddressId || billingAddressId === shipping.id) return { address: shipping, same: true };
  const address = await addressRepository.findOne(userId, billingAddressId, client);
  if (!address) throw ApiError.badRequest('Validation failed', { billing_address_id: 'Billing address not found' });
  return { address, same: false };
}

async function place(customer, {
  address_id: addressId, billing_address_id: billingAddressId, billing_company_name: companyName,
  billing_gstin: gstin, coupon_code: code, note,
}) {
  const orderId = await withTransaction(async (client) => {
    const cart = await cartService.load(customer.id, { client, lock: true });
    assertCartReady(cart);
    const address = await resolveAddress(customer.id, addressId, client);
    const billing = await resolveBilling(customer.id, billingAddressId, address, client);
    const { subtotal, mrp_total: mrpTotal } = cart.summary;
    const applied = code ? await resolveCoupon(code, customer.id, subtotal, { client, lock: true }) : null;
    const discount = applied?.discount ?? 0;

    const id = await orderRepository.createOrder({
      user_id: customer.id,
      subtotal,
      mrp_total: mrpTotal,
      coupon_id: applied?.coupon.id,
      coupon_code: applied?.coupon.code,
      coupon_discount: discount,
      shipping_fee: SHIPPING_FEE,
      total: round2(subtotal - discount + SHIPPING_FEE),
      ...addressColumns('ship', address),
      ...addressColumns('bill', billing.address),
      billing_same_as_shipping: billing.same,
      bill_company_name: companyName || null,
      bill_gstin: gstin || null,
      customer_note: note || null,
    }, client);
    await orderRepository.addItems(id, cart.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.name,
      product_slug: item.slug,
      variant_label: item.variant_label,
      sku: item.sku,
      image: item.image,
      unit_price: item.price,
      final_price: item.final_price,
      quantity: item.quantity,
      line_total: item.line_total,
    })), client);
    await cartService.clearWith(customer.id, client);
    return id;
  });

  const order = await get(customer.id, orderId);
  sendOrderEmails(order, order.items, customer);
  return order;
}

async function list(userId, pagination) {
  return orderRepository.findByUser(userId, pagination);
}

// One of the customer's orders, by id or order number ("ORD-000012").
async function get(userId, idOrNo) {
  const id = typeof idOrNo === 'number' ? idOrNo : parseOrderNo(idOrNo);
  const order = id ? await orderRepository.findById(id) : null;
  if (!order || order.user_id !== userId) throw ApiError.notFound('Order not found');
  const { user_id: _u, ...rest } = order;
  return { ...rest, items: await orderRepository.findItems(order.id) };
}

// Customers can cancel only before the order is confirmed.
async function cancel(userId, orderNo, reason) {
  const order = await get(userId, orderNo);
  if (order.status !== 'placed' || !(await orderRepository.cancelPlaced(order.id, reason || 'Cancelled by customer'))) {
    throw ApiError.conflict('This order can no longer be cancelled online. Please contact support.');
  }
  return get(userId, order.id);
}

module.exports = { summary, place, list, get, cancel };
