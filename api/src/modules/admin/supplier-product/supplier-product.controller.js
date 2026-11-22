// HTTP layer: read req, call supplier-product.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const supplierProductService = require('./supplier-product.service');

const FIELDS = ['supplier_id', 'name', 'price', 'hsn_code', 'gst_rate', 'is_active'];

function parseId(value, label = 'product') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

const pick = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

// ?supplier_id=&search=&status=active|inactive&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { status, supplier_id: supplierId } = req.query;
  const filters = {
    supplierId: supplierId ? parseId(supplierId, 'supplier') : undefined,
    search: req.query.search?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };
  const { items, total } = await supplierProductService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await supplierProductService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const product = await supplierProductService.create(pick(req.body));
  response.created(res, product, `${product.name} added`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await supplierProductService.update(parseId(req.params.id), pick(req.body)), 'Supplier product updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const product = await supplierProductService.update(parseId(req.params.id), { is_active: req.body.is_active });
  response.success(res, product, `${product.name} ${product.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await supplierProductService.remove(parseId(req.params.id));
  response.success(res, null, 'Supplier product deleted');
});

module.exports = { list, getById, create, update, setStatus, remove };
