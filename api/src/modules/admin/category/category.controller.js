// HTTP layer: read req, call category.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const categoryService = require('./category.service');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid category id');
  return id;
}

// Keeps only known fields and trims strings.
function pickFields(body) {
  const data = {};
  for (const key of ['parent_id', 'name', 'slug', 'description', 'image', 'sort_order', 'is_active']) {
    if (body[key] !== undefined) {
      data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }
  return data;
}

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { search, parent_id: parentId, status } = req.query;

  const filters = {
    search: search?.trim() || undefined,
    parentId: parentId === 'root' ? 'root' : parentId ? parseId(parentId) : undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };

  const { items, total } = await categoryService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const tree = asyncHandler(async (req, res) => {
  response.success(res, await categoryService.tree());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await categoryService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.create(pickFields(req.body));
  response.created(res, category, 'Category created');
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.update(parseId(req.params.id), pickFields(req.body));
  response.success(res, category, 'Category updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const category = await categoryService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, category, `Category ${category.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await categoryService.remove(parseId(req.params.id));
  response.success(res, null, 'Category deleted');
});

module.exports = { list, tree, getById, create, update, setStatus, remove };
