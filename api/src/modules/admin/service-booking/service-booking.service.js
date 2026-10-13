// Business logic for service bookings (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const constants = require('../../../constants/serviceBooking');
const bookingRepository = require('./service-booking.repository');

// Adds labels and nests the assigned technician:
// technician: { id, name, mobile, pincode, state, technician_photo, is_active } | null.
function format({
  technician_name: name, technician_mobile: mobile, technician_pincode: pincode, technician_state: state,
  technician_photo: photo, technician_is_active: isActive, ...booking
}) {
  return {
    ...constants.withLabels(booking),
    technician: booking.technician_id
      ? { id: booking.technician_id, name, mobile, pincode, state, technician_photo: photo, is_active: isActive }
      : null,
  };
}

async function getOrFail(id) {
  const booking = await bookingRepository.findById(id);
  if (!booking) throw ApiError.notFound('Booking not found');
  return format(booking);
}

async function list(filters, pagination) {
  const { items, total } = await bookingRepository.findAll(filters, pagination);
  return { items: items.map(format), total };
}

async function assertActiveTechnician(technicianId) {
  const technician = await bookingRepository.findTechnician(technicianId);
  if (!technician) throw ApiError.badRequest('Validation failed', { technician_id: 'Technician not found' });
  if (!technician.is_active) {
    throw ApiError.badRequest('Validation failed', { technician_id: 'Technician is inactive' });
  }
}

// Technicians to pick from for this booking (same pincode, then same state, then others).
async function technicianSuggestions(id, { limit, search }) {
  const booking = await getOrFail(id);
  return bookingRepository.findTechnicianSuggestions(booking, { limit, search });
}

// { all, open, assigned, completed }
async function summary() {
  const counts = { all: 0, open: 0, assigned: 0, completed: 0 };
  for (const row of await bookingRepository.countByStatus()) {
    counts[row.status] = row.total;
    counts.all += row.total;
  }
  return counts;
}

function options() {
  const { VEHICLE_TYPES, SERVICES, TIME_SLOTS, STATUSES, INDIAN_STATES } = constants;
  return {
    statuses: STATUSES, vehicle_types: VEHICLE_TYPES, services: SERVICES, time_slots: TIME_SLOTS, states: INDIAN_STATES,
  };
}

// Status side effects:
//   open      -> technician removed, assigned_at and completed_at cleared (re-opened)
//   assigned  -> needs a technician; assigned_at set (kept if already set), completed_at cleared
//   completed -> completed_at set, assigned_at set if it never was
function statusChanges(existing, status) {
  const now = new Date();
  if (status === 'open') return { technician_id: null, assigned_at: null, completed_at: null };
  if (status === 'assigned') return { assigned_at: existing.assigned_at ?? now, completed_at: null };
  return { assigned_at: existing.assigned_at ?? now, completed_at: existing.completed_at ?? now };
}

// Any of { status, technician_id, admin_notes }.
async function update(id, data) {
  const existing = await getOrFail(id);
  const changes = { ...data };
  const technicianChanged = data.technician_id !== undefined && data.technician_id !== existing.technician_id;
  if (technicianChanged && data.technician_id !== null) await assertActiveTechnician(data.technician_id);

  if (data.status !== undefined && data.status !== existing.status) {
    Object.assign(changes, statusChanges(existing, data.status));
  }
  // technician_id: null (unassign) is only allowed when the booking isn't "assigned" afterwards.
  const finalStatus = changes.status ?? existing.status;
  const finalTechnician = changes.technician_id !== undefined ? changes.technician_id : existing.technician_id;
  if (finalStatus === 'assigned' && !finalTechnician) {
    throw ApiError.badRequest('Validation failed', {
      technician_id: data.technician_id === null
        ? 'An assigned booking needs a technician; set status to open to unassign'
        : 'Assign a technician to mark the booking as assigned',
    });
  }
  // A new technician on an assigned booking restarts assigned_at.
  if (technicianChanged && (changes.status ?? existing.status) === 'assigned') changes.assigned_at = new Date();

  await bookingRepository.update(id, changes);
  return getOrFail(id);
}

// PATCH /:id/assign — assigns (or re-assigns) a technician and marks the booking "assigned".
async function assign(id, { technician_id: technicianId, admin_notes: notes }) {
  const existing = await getOrFail(id);
  if (existing.status === 'completed') {
    throw ApiError.conflict('Booking is already completed; re-open it before assigning a technician');
  }
  return update(id, { technician_id: technicianId, status: 'assigned', ...(notes !== undefined && { admin_notes: notes }) });
}

async function remove(id) {
  await getOrFail(id);
  await bookingRepository.remove(id);
}

module.exports = {
  list, summary, options, getById: getOrFail, technicianSuggestions, update, assign, remove,
};
