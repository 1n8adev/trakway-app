// HTTP layer: read req, call product-accessory.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const accessoryService = require('./product-accessory.service');

const FIELDS = ['name', 'price', 'hsn_code', 'gst_rate', 'is_active', 'supplier_product_ids'];

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid accessory id');
  return id;
}

const pick = (body) => Object.fromEntries(FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

// ?search=&status=active|inactive&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { status } = req.query;
  const filters = {
    search: req.query.search?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };
  const { items, total } = await accessoryService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

// Every supplier product with its current accessory mapping (for the form's picker).
const supplierProducts = asyncHandler(async (req, res) => {
  response.success(res, await accessoryService.mappableSupplierProducts());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await accessoryService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const accessory = await accessoryService.create(pick(req.body));
  response.created(res, accessory, `${accessory.name} added`);
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await accessoryService.update(parseId(req.params.id), pick(req.body)), 'Accessory updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const accessory = await accessoryService.update(parseId(req.params.id), { is_active: req.body.is_active });
  response.success(res, accessory, accessory.is_active ? `${accessory.name} activated` : `${accessory.name} deactivated`);
});

const remove = asyncHandler(async (req, res) => {
  await accessoryService.remove(parseId(req.params.id));
  response.success(res, null, 'Accessory deleted');
});

module.exports = { list, supplierProducts, getById, create, update, setStatus, remove };
