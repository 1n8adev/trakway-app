// HTTP layer: read req, call order.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const orderService = require('./order.service');
const invoiceService = require('../../invoice/invoice.service');

const summary = asyncHandler(async (req, res) => {
  response.success(res, await orderService.summary(req.customer.id, { coupon_code: req.body.coupon_code }));
});

const place = asyncHandler(async (req, res) => {
  const fields = ['address_id', 'billing_address_id', 'billing_company_name', 'billing_gstin', 'coupon_code', 'note'];
  const input = Object.fromEntries(fields.map((key) => [key, req.body[key]]));
  input.payment_method = req.body.payment_method || 'razorpay';
  const order = await orderService.place(req.customer, input);
  response.created(res, order, order.razorpay ? `Order ${order.order_no} created. Complete the payment to place it.`
    : `Order ${order.order_no} placed successfully`);
});

// Razorpay Checkout options to (re)try paying an order that is waiting for payment.
const pay = asyncHandler(async (req, res) => {
  response.success(res, await orderService.pay(req.customer, req.params.orderNo));
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const order = await orderService.verifyPayment(req.customer, req.params.orderNo,
    { razorpay_order_id, razorpay_payment_id, razorpay_signature });
  response.success(res, order, `Payment received. Order ${order.order_no} placed successfully`);
});

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination({ limit: 10, ...req.query });
  const { items, total } = await orderService.list(req.customer.id, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const get = asyncHandler(async (req, res) => {
  response.success(res, await orderService.get(req.customer.id, req.params.orderNo));
});

const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancel(req.customer.id, req.params.orderNo, req.body.reason);
  response.success(res, order, `Order ${order.order_no} cancelled`);
});

// PDF tax invoice for one of the customer's own orders (404 for anyone else's).
const invoice = asyncHandler(async (req, res) => {
  const order = await orderService.get(req.customer.id, req.params.orderNo);
  invoiceService.sendPdf(res, await invoiceService.getInvoicePdf(order.id));
});

module.exports = { summary, place, pay, verifyPayment, list, get, cancel, invoice };
