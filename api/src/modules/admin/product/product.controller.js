// HTTP layer: read req, call product.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const productService = require('./product.service');
const variantService = require('./product-variant.service');
const { FIELDS } = require('./product.validation');

function parseId(value, label = 'product') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest(`Invalid ${label} id`);
  return id;
}

// Keeps only the given fields and trims top-level strings.
function pickFields(body, fields) {
  const data = {};
  for (const key of fields) {
    if (body[key] !== undefined) {
      data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }
  return data;
}

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { search, category_id: categoryId, status } = req.query;

  const filters = {
    search: search?.trim() || undefined,
    categoryId: categoryId ? parseId(categoryId, 'category') : undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };

  const { items, total } = await productService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await productService.getById(parseId(req.params.id)));
});

// Tab 1: Basic Information (with images) — creates the product.
const create = asyncHandler(async (req, res) => {
  const product = await productService.create(pickFields(req.body, FIELDS.create));
  response.created(res, product, 'Product created');
});

// Each tab saves only its own fields; all return the full updated product.
const updateTab = (fields, message) => asyncHandler(async (req, res) => {
  const product = await productService.update(parseId(req.params.id), pickFields(req.body, fields));
  response.success(res, product, message);
});

const updateBasic = updateTab(FIELDS.basic, 'Basic information updated');
const updateBenefits = updateTab(FIELDS.benefits, 'Benefits updated');
const updateSpecifications = updateTab(FIELDS.specifications, 'Specifications updated');
const updatePackageDetails = updateTab(FIELDS.packageDetails, 'Package details updated');
const updateBoxContents = updateTab(FIELDS.boxContents, 'Box contents updated');

// Tab: Combinations — { attributes, variants } for one product.
const getVariants = asyncHandler(async (req, res) => {
  response.success(res, await variantService.get(parseId(req.params.id)));
});

const updateVariants = asyncHandler(async (req, res) => {
  const variants = req.body.variants.map((v) => ({ ...v, sku: typeof v.sku === 'string' ? v.sku.trim() : v.sku }));
  const result = await variantService.replace(parseId(req.params.id), variants);
  response.success(res, result, 'Combinations updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const product = await productService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, product, `Product ${product.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await productService.remove(parseId(req.params.id));
  response.success(res, null, 'Product deleted');
});

module.exports = {
  list,
  getById,
  create,
  updateBasic,
  updateBenefits,
  updateSpecifications,
  updatePackageDetails,
  updateBoxContents,
  getVariants,
  updateVariants,
  setStatus,
  remove,
};
