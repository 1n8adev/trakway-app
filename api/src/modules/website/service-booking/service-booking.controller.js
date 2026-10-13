// HTTP layer: read req, call service-booking.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const bookingService = require('./service-booking.service');

const create = asyncHandler(async (req, res) => {
  const booking = await bookingService.create(req.body, req.ip);
  response.created(res, booking, 'Your booking request has been received — our team will contact you shortly.');
});

const options = asyncHandler(async (req, res) => {
  response.success(res, bookingService.options());
});

module.exports = { create, options };
