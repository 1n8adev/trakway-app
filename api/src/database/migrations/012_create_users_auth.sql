-- Website customers.
CREATE TABLE users (
  id                BIGSERIAL PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(10),            -- 10-digit Indian mobile, optional
  password_hash     VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMPTZ,            -- NULL until the registration OTP is verified
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email));
CREATE INDEX users_phone_idx ON users (phone);

-- One-time codes sent by email. Only a hash of the code is stored.
CREATE TABLE email_otps (
  id          BIGSERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  purpose     VARCHAR(20)  NOT NULL CHECK (purpose IN ('register', 'reset_password')),
  code_hash   CHAR(64)     NOT NULL,
  attempts    INTEGER      NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ  NOT NULL,
  consumed_at TIMESTAMPTZ,                  -- set when used, or when a newer code replaces it
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX email_otps_lookup_idx ON email_otps (LOWER(email), purpose, created_at DESC);

-- Refresh tokens (hashed). Rotated on every use: the old row gets revoked_at + replaced_by.
CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by BIGINT REFERENCES refresh_tokens (id) ON DELETE SET NULL,
  user_agent  VARCHAR(255),
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
