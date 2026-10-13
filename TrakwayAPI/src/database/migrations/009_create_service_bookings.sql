-- "Book a GPS Service" requests from the website, handled in the admin panel.
-- Allowed codes for vehicle_type / service / preferred_time live in src/constants/serviceBooking.js.
CREATE TABLE service_bookings (
  id             BIGSERIAL PRIMARY KEY,
  vehicle_type   VARCHAR(30)  NOT NULL,
  service        VARCHAR(30)  NOT NULL,
  preferred_date DATE         NOT NULL,
  preferred_time VARCHAR(20)  NOT NULL,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(255),
  phone          VARCHAR(10)  NOT NULL,  -- 10-digit Indian mobile, without +91
  address        TEXT         NOT NULL,
  pincode        CHAR(6)      NOT NULL,
  state          VARCHAR(60)  NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'assigned', 'completed')),
  assigned_to    VARCHAR(100),           -- technician / staff name
  admin_notes    TEXT,
  assigned_at    TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  ip_address     VARCHAR(45),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX service_bookings_status_idx ON service_bookings (status, created_at DESC);
CREATE INDEX service_bookings_created_idx ON service_bookings (created_at DESC);
