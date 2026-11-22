// HTTP layer: read req, call purchase.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const purchaseService = require('./purchase.service');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ['supplier_id', 'bill_no', 'bill_date', 'notes', 'items', 'bill_file', 'bill_file_name', 'remove_bill_file'];

function parseId(value, label = 'purchase') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

const pick = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

const options = asyncHandler(async (req, res) => {
  response.success(res, await purchaseService.options());
});

// ?search=&supplier_id=&from=&to=&page=&limit= — meta adds total_amount of all matching purchases.
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { search, supplier_id: supplierId, from, to } = req.query;
  const { items, total, totalAmount } = await purchaseService.list({
    search: search?.trim() || undefined,
    supplierId: supplierId ? parseId(supplierId, 'supplier') : undefined,
    from: DATE_REGEX.test(from || '') ? from : undefined,
    to: DATE_REGEX.test(to || '') ? to : undefined,
  }, pagination);
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Success',
    data: items,
    pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) },
    summary: { total_amount: totalAmount },
  });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await purchaseService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.create(pick(req.body), req.user?.id);
  response.created(res, purchase, `Purchase ${purchase.purchase_no} saved`);
});

const update = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.update(parseId(req.params.id), pick(req.body));
  response.success(res, purchase, `Purchase ${purchase.purchase_no} updated`);
});

const remove = asyncHandler(async (req, res) => {
  await purchaseService.remove(parseId(req.params.id));
  response.success(res, null, 'Purchase deleted');
});

// Streams the uploaded supplier bill (admin token; never cached).
const billFile = asyncHandler(async (req, res) => {
  const file = await purchaseService.billFile(parseId(req.params.id));
  res.set('Cache-Control', 'private, no-store');
  res.set('Content-Disposition', `inline; filename="${file.name.replace(/[^\w.\- ]/g, '_')}"`);
  res.sendFile(file.path);
});

module.exports = { options, list, getById, create, update, remove, billFile };
