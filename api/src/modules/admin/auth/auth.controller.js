// HTTP layer: read req, call auth.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email.trim(), req.body.password);
  response.success(res, result, 'Login successful');
});

const me = asyncHandler(async (req, res) => {
  const admin = await authService.getProfile(req.user.id);
  response.success(res, admin);
});

module.exports = { login, me };
