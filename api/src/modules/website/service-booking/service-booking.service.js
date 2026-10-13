// Business logic for website service bookings.
const constants = require('../../../constants/serviceBooking');
const bookingRepository = require('./service-booking.repository');

const FIELDS = ['vehicle_type', 'service', 'preferred_date', 'preferred_time', 'name', 'email',
  'phone', 'address', 'pincode', 'state'];

// Saves a booking request (status "open"). Returns what the "Thanks!" screen needs.
async function create(data, ipAddress) {
  const row = {};
  for (const key of FIELDS) row[key] = data[key] ?? null;
  const booking = await bookingRepository.create({ ...row, ip_address: ipAddress });
  return constants.withLabels(booking);
}

// Dropdown options for the form, so the website and API use the same lists.
function options() {
  const { VEHICLE_TYPES, SERVICES, TIME_SLOTS, INDIAN_STATES } = constants;
  return { vehicle_types: VEHICLE_TYPES, services: SERVICES, time_slots: TIME_SLOTS, states: INDIAN_STATES };
}

module.exports = { create, options };
