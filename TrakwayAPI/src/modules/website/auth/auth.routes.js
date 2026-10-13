const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const { authenticate, authorize } = require('../../../middlewares/auth');
const { limitRequests } = require('../../../middlewares/rateLimit');
const authValidation = require('./auth.validation');
const authController = require('./auth.controller');

// Mounted at /api/auth (public, except /me). Accepts JSON, form-data or urlencoded.
const router = express.Router();
const body = [formFields(), authValidation.normalize];

// Per-IP limits on top of the per-email OTP limits in auth.service.js. Each route gets its own
// counter, so e.g. mistyped OTPs don't use up the login allowance.
const sendLimit = () => limitRequests({
  windowMinutes: 15, max: 10, message: 'Too many requests. Please try again later.',
});
const guessLimit = (max) => limitRequests({
  windowMinutes: 15, max, count: 'failed', message: 'Too many failed attempts. Please try again in 15 minutes.',
});

router.post('/register', sendLimit(), ...body, validate(authValidation.register), authController.register);
router.post('/register/resend-otp', sendLimit(), ...body, validate(authValidation.email), authController.resendRegisterOtp);
router.post('/register/verify', guessLimit(10), ...body, validate(authValidation.emailOtp), authController.verifyRegistration);

router.post('/login', guessLimit(20), ...body, validate(authValidation.login), authController.login);
router.post('/refresh', ...body, validate(authValidation.refreshToken), authController.refresh);
router.post('/logout', ...body, validate(authValidation.refreshToken), authController.logout);
router.get('/me', authenticate, authorize('customer'), authController.me);

router.post('/forgot-password', sendLimit(), ...body, validate(authValidation.email), authController.forgotPassword);
router.post('/forgot-password/verify', guessLimit(10), ...body, validate(authValidation.emailOtp), authController.verifyResetOtp);
router.post('/reset-password', guessLimit(10), ...body, validate(authValidation.resetPassword), authController.resetPassword);

module.exports = router;
