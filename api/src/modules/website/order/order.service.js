// Business logic for checkout (Cash on Delivery or Razorpay) and customer orders. Throws ApiError on rule violations.
const { withTransaction } = require('../../../config/db');
const ApiError = require('../../../utils/ApiError');
const env = require('../../../config/env');
const { round2 } = require('../../../utils/money');
const { couponDiscount, couponProblem, couponSummary } = require('../../../utils/coupon');
const paymentService = require('../../payment/payment.service');
const { sendOrderEmails } = require('./order.emails');
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
    },
    payment_methods: paymentMethods(),
  };
}

// 'razorpay' when the Razorpay keys are set; 'cod' only when COD_ENABLED=true.
const paymentMethods = () => [
  ...(paymentService.isEnabled() ? ['razorpay'] : []),
  ...(env.codEnabled ? ['cod'] : []),
];

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

// Places an order from the whole cart, in one transaction with the cart rows locked (a double click can't
// order twice). Cash on Delivery: placed now, cart emptied, emails sent. Razorpay: saved as 'pending_payment'
// with the cart kept; the response carries `razorpay` (Razorpay Checkout options) and the order becomes
// 'placed' once the payment is verified (verifyPayment / webhook).
async function place(customer, {
  address_id: addressId, billing_address_id: billingAddressId, billing_company_name: companyName,
  billing_gstin: gstin, coupon_code: code, note, payment_method: paymentMethod = 'razorpay',
}) {
  const online = paymentMethod === 'razorpay';
  if (!online && !env.codEnabled) {
    throw ApiError.badRequest('Cash on Delivery is not available. Please pay online.', { payment_method: 'Cash on Delivery is not available' });
  }
  if (online && !paymentService.isEnabled()) {
    throw ApiError.badRequest('Online payment is not available right now', { payment_method: 'Online payment is not available right now' });
  }
  // An earlier unpaid checkout would hold coupon uses and stock: replace it.
  await paymentService.cancelUnpaidForUser(customer.id);

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
      status: online ? 'pending_payment' : 'placed',
      payment_method: online ? 'razorpay' : 'cod',
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
    if (!online) await cartService.clearWith(customer.id, client);
    return id;
  });

  if (online) {
    try {
      const razorpay = await paymentService.checkoutOptions(orderId, customer);
      return { ...(await get(customer.id, orderId)), razorpay };
    } catch (err) {
      await paymentService.cancelUnpaid(orderId, 'Payment could not be started');
      throw err;
    }
  }
  const order = await get(customer.id, orderId);
  sendOrderEmails(order, order.items, customer);
  return order;
}

// Razorpay Checkout options for an order still waiting for payment (retry from the order page).
async function pay(customer, orderNo) {
  const order = await get(customer.id, orderNo);
  return paymentService.checkoutOptions(order.id, customer);
}

// Razorpay Checkout handler result -> verified, captured, order placed. Returns the order.
async function verifyPayment(customer, orderNo, body) {
  const order = await get(customer.id, orderNo);
  await paymentService.verifyCheckout(customer, order.id, body);
  return get(customer.id, order.id);
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
  const [items, payments] = await Promise.all([
    orderRepository.findItems(order.id),
    order.payment_method === 'razorpay' ? paymentService.listPayments(order.id) : [],
  ]);
  // Online orders: the successful (or latest) payment attempt, for the order page.
  const shown = payments.find((p) => ['captured', 'refunded'].includes(p.status)) || payments[0];
  const payment = shown ? {
    razorpay_payment_id: shown.razorpay_payment_id, status: shown.status, method: shown.method, amount: shown.amount,
    error_description: shown.error_description, refund_status: shown.refund_status, refund_amount: shown.refund_amount,
    refunded_at: shown.refunded_at,
  } : null;
  return { ...rest, items, payment };
}

// Customers can cancel only before the order is confirmed. An online payment already made is refunded.
async function cancel(userId, orderNo, reason) {
  let order = await get(userId, orderNo);
  const why = reason || 'Cancelled by customer';
  if (order.status === 'pending_payment') {
    if (await paymentService.cancelUnpaid(order.id, why)) return get(userId, order.id);
    order = await get(userId, order.id); // paid meanwhile: cancel it like a placed order
  }
  if (order.status !== 'placed' || !(await orderRepository.cancelPlaced(order.id, why))) {
    throw ApiError.conflict('This order can no longer be cancelled online. Please contact support.');
  }
  if (order.payment_method === 'razorpay' && order.payment_status === 'paid') {
    try {
      await paymentService.refundOrder(order.id, why);
    } catch (err) {
      console.error(`Refund for ${order.order_no} failed:`, err.message);
      const fresh = await get(userId, order.id);
      return { ...fresh, refund_error: 'Your order is cancelled. The refund could not be started automatically; our team will process it shortly.' };
    }
  }
  return get(userId, order.id);
}

module.exports = { summary, place, pay, verifyPayment, list, get, cancel };
