// HTTP layer: read req, call product.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const productService = require('./product.service');

const MAX_LATEST = 24;

// Home page "Our Product": newest products. ?limit= (default 8, max 24)
const latest = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), MAX_LATEST);
  response.success(res, await productService.latest(limit));
});

// Products page: ?category=<slug>&search=&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination({ limit: 12, ...req.query });
  const filters = {
    categorySlug: req.query.category?.trim() || undefined,
    search: req.query.search?.trim() || undefined,
  };
  const { items, total } = await productService.list(filters, pagination);
  response.paginated(res, items, { ...pagination, total });
});

// Details page.
const getBySlug = asyncHandler(async (req, res) => {
  response.success(res, await productService.getBySlug(req.params.slug));
});

module.exports = { latest, list, getBySlug };
