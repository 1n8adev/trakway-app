// HTTP layer: read req, call user.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const userService = require('./user.service');
const { SORTS } = require('./user.repository');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid user id');
  return id;
}

const flag = (value, yes, no) => (value === yes ? true : value === no ? false : undefined);

// ?search=&status=active|inactive&verified=true|false&has_orders=true|false
//  &sort=newest|orders|spent|last_order&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { sort } = req.query;
  if (sort && !SORTS[sort]) throw ApiError.badRequest(`sort must be ${Object.keys(SORTS).join(', ')}`);
  const { items, total } = await userService.list({
    search: req.query.search?.trim() || undefined,
    isActive: flag(req.query.status, 'active', 'inactive'),
    verified: flag(req.query.verified, 'true', 'false'),
    hasOrders: flag(req.query.has_orders, 'true', 'false'),
    sort: sort || 'newest',
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const summary = asyncHandler(async (req, res) => {
  response.success(res, await userService.summary());
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await userService.getById(parseId(req.params.id)));
});

const setStatus = asyncHandler(async (req, res) => {
  const user = await userService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, user, user.is_active ? 'User activated' : 'User blocked and logged out of all devices');
});

module.exports = { list, summary, getById, setStatus };
