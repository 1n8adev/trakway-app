// HTTP layer: read req, call stock.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const stockService = require('./stock.service');

const STATUSES = ['in_stock', 'out_of_stock', 'negative'];

// ?type=product|accessory&search=&status=in_stock|out_of_stock|negative&active=true|false
const list = asyncHandler(async (req, res) => {
  const { type, search, status, active } = req.query;
  response.success(res, await stockService.list({
    type: stockService.TYPES.includes(type) ? type : undefined,
    search: search?.trim() || undefined,
    status: STATUSES.includes(status) ? status : undefined,
    active: active === 'true' ? true : active === 'false' ? false : undefined,
  }));
});

// /:type/:id/history — type is product or accessory.
const history = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid id');
  response.success(res, await stockService.history(req.params.type, id));
});

module.exports = { list, history };
