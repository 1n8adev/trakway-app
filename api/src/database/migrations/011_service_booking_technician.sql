-- Assign bookings to a real technician instead of free text.
-- RESTRICT: a technician with bookings can't be deleted (deactivate instead).
ALTER TABLE service_bookings
  ADD COLUMN technician_id BIGINT REFERENCES technicians (id) ON DELETE RESTRICT,
  DROP COLUMN assigned_to;

CREATE INDEX service_bookings_technician_idx ON service_bookings (technician_id);
