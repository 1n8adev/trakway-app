// HTTP layer: read req, call faq.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const faqService = require('./faq.service');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid FAQ id');
  return id;
}

// Keeps only known fields and trims strings.
function pickFields(body) {
  const data = {};
  for (const key of ['question', 'answer', 'sort_order', 'is_active']) {
    if (body[key] !== undefined) data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  return data;
}

const list = asyncHandler(async (req, res) => {
  const pagination = getPagination({ limit: 50, ...req.query });
  const { search, status } = req.query;
  const { items, total } = await faqService.list({
    search: search?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await faqService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await faqService.create(pickFields(req.body)), 'FAQ created');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await faqService.update(parseId(req.params.id), pickFields(req.body)), 'FAQ updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const faq = await faqService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, faq, `FAQ ${faq.is_active ? 'activated' : 'deactivated'}`);
});

const reorder = asyncHandler(async (req, res) => {
  await faqService.reorder(req.body.ids);
  response.success(res, null, 'FAQ order updated');
});

const remove = asyncHandler(async (req, res) => {
  await faqService.remove(parseId(req.params.id));
  response.success(res, null, 'FAQ deleted');
});

module.exports = { list, getById, create, update, setStatus, reorder, remove };
