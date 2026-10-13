const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const { limitRequests } = require('../../../middlewares/rateLimit');
const bookingValidation = require('./service-booking.validation');
const bookingController = require('./service-booking.controller');

// Mounted at /api/service-bookings (public). Accepts JSON, form-data or urlencoded.
const router = express.Router();

// Public form: at most 5 bookings per IP per 15 minutes (spam protection).
const bookingLimit = limitRequests({
  windowMinutes: 15,
  max: 5,
  message: 'Too many booking requests. Please try again after some time or call us.',
});

router.get('/options', bookingController.options);
router.post('/', bookingLimit, formFields(), bookingValidation.normalize, validate(bookingValidation.create), bookingController.create);

module.exports = router;
