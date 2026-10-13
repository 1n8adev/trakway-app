const express = require('express');
const validate = require('../../../middlewares/validate');
const { formFields } = require('../../../middlewares/upload');
const bookingValidation = require('./service-booking.validation');
const bookingController = require('./service-booking.controller');

// Mounted at /api/admin/service-bookings (admin JWT required — see admin.routes.js).
const router = express.Router();
const body = [formFields(), bookingValidation.normalize];

router.get('/', bookingController.list);
router.get('/summary', bookingController.summary); // before /:id
router.get('/options', bookingController.options);
router.get('/:id', bookingController.getById);
router.get('/:id/technicians', bookingController.technicians);
router.patch('/:id/assign', ...body, validate(bookingValidation.assign), bookingController.assign);
router.patch('/:id/status', ...body, validate(bookingValidation.status), bookingController.setStatus);
router.patch('/:id', ...body, validate(bookingValidation.update), bookingController.update);
router.delete('/:id', bookingController.remove);

module.exports = router;
