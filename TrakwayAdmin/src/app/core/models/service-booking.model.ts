export type BookingStatus = 'open' | 'assigned' | 'completed';

export interface ServiceBooking {
  id: number;
  // "SB-000012"
  booking_no: string;
  vehicle_type: string;
  vehicle_type_label: string;
  service: string;
  service_label: string;
  // YYYY-MM-DD
  preferred_date: string;
  preferred_time: string;
  preferred_time_label: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  pincode: string;
  state: string;
  status: BookingStatus;
  status_label: string;
  technician_id: number | null;
  technician: BookingTechnician | null;
  admin_notes: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  search?: string;
  service?: string;
  vehicle_type?: string;
  technician_id?: number;
  // YYYY-MM-DD, on preferred_date.
  from?: string;
  to?: string;
}

// Tab counts from GET /service-bookings/summary.
export interface BookingSummary {
  all: number;
  open: number;
  assigned: number;
  completed: number;
}

export interface BookingOption {
  value: string;
  label: string;
}

export interface BookingOptions {
  statuses: BookingOption[];
  vehicle_types: BookingOption[];
  services: BookingOption[];
  time_slots: BookingOption[];
  states: string[];
}

// The technician on a booking response.
export interface BookingTechnician {
  id: number;
  name: string;
  mobile: string;
  pincode: string;
  state: string;
  technician_photo: string | null;
  is_active: boolean;
}

// GET /service-bookings/:id/technicians — active technicians, nearest first
// (by match, then fewest open jobs, then name).
export interface TechnicianChoice extends BookingTechnician {
  // pincode = same pincode, area = same first 3 digits, state = same state.
  match: 'pincode' | 'area' | 'state' | 'other';
  // Their bookings currently in "assigned".
  open_jobs: number;
}

// PATCH /service-bookings/:id(/status). The API's rules:
// - status "assigned" needs a technician; "open" removes the technician; "completed" keeps it.
// - technician_id null unassigns; a new technician must be active.
// - "" or null clears admin_notes.
export interface BookingUpdatePayload {
  status?: BookingStatus;
  technician_id?: number | null;
  admin_notes?: string | null;
}

// Limits from the API's admin service-booking.validation.js.
export const BOOKING_LIMITS = {
  maxAdminNotes: 5000,
} as const;
