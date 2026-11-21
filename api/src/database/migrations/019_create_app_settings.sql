-- Admin-editable settings as key/value text, e.g. 'invoice.vendor_terms'.
-- A missing key means "use the built-in default" from config/env.js.
CREATE TABLE app_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_by BIGINT REFERENCES admin_users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
