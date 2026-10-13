// Request validators for the website "Book a GPS Service" form, used with middlewares/validate.
const { VEHICLE_TYPES, SERVICES, TIME_SLOTS, INDIAN_STATES, values } = require('../../../constants/serviceBooking');
const { normalizePhone, isMobile } = require('../../../utils/phone');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS_AHEAD = 365;

// Today's date in India as YYYY-MM-DD.
const todayInIndia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// "2026-02-30" is not a real date.
const isRealDate = (iso) => DATE_REGEX.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;

// Middleware: trims strings, normalizes phone/email, "" -> null for the optional email.
function normalize(req, res, next) {
  const body = {};
  for (const [key, value] of Object.entries(req.body || {})) {
    body[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (body.phone !== undefined) body.phone = normalizePhone(body.phone);
  if (body.email === '' || body.email === null) body.email = null;
  else if (typeof body.email === 'string') body.email = body.email.toLowerCase();
  if (typeof body.pincode === 'number') body.pincode = String(body.pincode);
  req.body = body;
  next();
}

function oneOf(value, list, label) {
  if (value === undefined || value === null || value === '') return `${label} is required`;
  return list.includes(value) ? null : `Select a valid ${label.toLowerCase()}`;
}

function text(value, label, max) {
  if (typeof value !== 'string' || !value) return `${label} is required`;
  return value.length > max ? `${label} must be at most ${max} characters` : null;
}

// POST /api/service-bookings
function create(body) {
  const errors = {};
  const check = (field, message) => {
    if (message) errors[field] = message;
  };

  check('vehicle_type', oneOf(body.vehicle_type, values(VEHICLE_TYPES), 'Vehicle type'));
  check('service', oneOf(body.service, values(SERVICES), 'Service'));
  check('preferred_time', oneOf(body.preferred_time, values(TIME_SLOTS), 'Preferred time'));
  check('state', oneOf(body.state, INDIAN_STATES, 'State'));

  const today = todayInIndia();
  if (!body.preferred_date) errors.preferred_date = 'Preferred date is required';
  else if (typeof body.preferred_date !== 'string' || !isRealDate(body.preferred_date)) errors.preferred_date = 'Enter a valid date';
  else if (body.preferred_date < today) errors.preferred_date = 'Preferred date cannot be in the past';
  else if (body.preferred_date > addDays(today, MAX_DAYS_AHEAD)) errors.preferred_date = 'Choose a date within the next year';

  check('name', text(body.name, 'Name', 100));
  check('address', text(body.address, 'Address', 500));

  if (body.email !== undefined && body.email !== null
    && (typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email) || body.email.length > 255)) {
    errors.email = 'Enter a valid email address';
  }
  if (!body.phone) errors.phone = 'Phone number is required';
  else if (!isMobile(body.phone)) errors.phone = 'Enter a valid 10-digit mobile number';

  if (!body.pincode) errors.pincode = 'Pincode is required';
  else if (typeof body.pincode !== 'string' || !PINCODE_REGEX.test(body.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';

  return errors;
}

module.exports = { normalize, create };
