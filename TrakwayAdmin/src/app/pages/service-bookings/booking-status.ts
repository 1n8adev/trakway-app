import { BookingStatus } from '../../core/models/service-booking.model';

// Badge colours per status: open = needs action (orange), assigned = in progress, completed = done.
export const STATUS_BADGE: Record<BookingStatus, string> = {
  open: 'bg-brand-100 text-brand-600',
  assigned: 'bg-sky-50 text-sky-700',
  completed: 'bg-green-50 text-green-700',
};
