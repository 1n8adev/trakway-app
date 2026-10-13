CREATE TABLE admin_users (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(100),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emails are unique regardless of case.
CREATE UNIQUE INDEX admin_users_email_unique ON admin_users (LOWER(email));
