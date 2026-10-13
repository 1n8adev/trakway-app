// HTTP layer: read req, call coupon.service, send response via utils/response.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const { getPagination } = require('../../../utils/pagination');
const couponService = require('./coupon.service');
const { ALL_FIELDS } = require('./coupon.validation');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid coupon id');
  return id;
}

const pick = (body) => {
  const data = {};
  for (const key of ALL_FIELDS) if (body[key] !== undefined) data[key] = body[key];
  return data;
};

// ?search=&status=active|inactive&page=&limit=
const list = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.query);
  const { status, search } = req.query;
  const { items, total } = await couponService.list({
    search: search?.trim() || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  }, pagination);
  response.paginated(res, items, { ...pagination, total });
});

const getById = asyncHandler(async (req, res) => {
  response.success(res, await couponService.getById(parseId(req.params.id)));
});

const create = asyncHandler(async (req, res) => {
  response.created(res, await couponService.create(pick(req.body)), 'Coupon created');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await couponService.update(parseId(req.params.id), pick(req.body)), 'Coupon updated');
});

const setStatus = asyncHandler(async (req, res) => {
  const coupon = await couponService.setStatus(parseId(req.params.id), req.body.is_active);
  response.success(res, coupon, `Coupon ${coupon.is_active ? 'activated' : 'deactivated'}`);
});

const remove = asyncHandler(async (req, res) => {
  await couponService.remove(parseId(req.params.id));
  response.success(res, null, 'Coupon deleted');
});

module.exports = { list, getById, create, update, setStatus, remove };
