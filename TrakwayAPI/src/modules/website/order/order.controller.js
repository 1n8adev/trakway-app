// HTTP layer: read req, call order.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const orderService = require('./order.service');

const summary = asyncHandler(async (req, res) => {
  response.success(res, await orderService.summary(req.customer.id, { coupon_code: req.body.coupon_code }));
});

const place = asyncHandler(async (req, res) => {
  const fields = ['address_id', 'billing_address_id', 'billing_company_name', 'billing_gstin', 'coupon_code', 'note'];
  const order = await orderService.place(req.customer, Object.fromEntries(fields.map((key) => [key, req.body[key]])));
  response.created(res, order, `Order ${order.order_no} placed successfully`);
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

module.exports = { summary, place, list, get, cancel };
