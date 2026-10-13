// Options for the "Book a GPS Service" form. Stored values are the codes; labels are for display.
// Shared by the website (submit + options endpoint) and admin (filters, labels).

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike / Two-Wheeler' },
  { value: 'truck', label: 'Truck / Commercial Vehicle' },
  { value: 'bus', label: 'Bus' },
  { value: 'other', label: 'Other' },
];

const SERVICES = [
  { value: 'installation', label: 'GPS Installation' },
  { value: 'replacement', label: 'Device Replacement' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'relocation', label: 'Device Relocation' },
  { value: 'maintenance', label: 'Annual Maintenance' },
];

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (9 AM – 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 4 PM)' },
  { value: 'evening', label: 'Evening (4 PM – 7 PM)' },
];

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'completed', label: 'Completed' },
];

const INDIAN_STATES = require('./indianStates');

const values = (list) => list.map((item) => item.value);
const labelOf = (list, value) => list.find((item) => item.value === value)?.label ?? value;

// Adds display labels next to the stored codes of a booking row.
const withLabels = (booking) => ({
  ...booking,
  vehicle_type_label: labelOf(VEHICLE_TYPES, booking.vehicle_type),
  service_label: labelOf(SERVICES, booking.service),
  preferred_time_label: labelOf(TIME_SLOTS, booking.preferred_time),
  status_label: labelOf(STATUSES, booking.status),
});

module.exports = { VEHICLE_TYPES, SERVICES, TIME_SLOTS, STATUSES, INDIAN_STATES, values, withLabels };
