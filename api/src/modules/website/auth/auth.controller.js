// HTTP layer: read req, call auth.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const authService = require('./auth.service');

// Device info stored with each refresh token.
const meta = (req) => ({ ip: req.ip, userAgent: (req.get('user-agent') || '').slice(0, 255) || null });

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const result = await authService.register({ name, email, phone, password }, meta(req));
  response.created(res, result, 'We have sent a verification code to your email');
});

const resendRegisterOtp = asyncHandler(async (req, res) => {
  response.success(res, await authService.resendRegisterOtp({ email: req.body.email }), 'A new code has been sent');
});

const verifyRegistration = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegistration({ email: req.body.email, otp: req.body.otp }, meta(req));
  response.success(res, result, 'Email verified. Your account is ready.');
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login({ email: req.body.email, password: req.body.password }, meta(req));
  response.success(res, result, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  response.success(res, await authService.refresh({ refresh_token: req.body.refresh_token }, meta(req)), 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({ refresh_token: req.body.refresh_token });
  response.success(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  response.success(res, await authService.me(req.user.id));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword({ email: req.body.email });
  response.success(res, result, result.message);
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyResetOtp({ email: req.body.email, otp: req.body.otp });
  response.success(res, result, 'Code verified. Set your new password.');
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword({ reset_token: req.body.reset_token, password: req.body.password });
  response.success(res, null, 'Password updated. Please log in with your new password.');
});

module.exports = {
  register,
  resendRegisterOtp,
  verifyRegistration,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};
