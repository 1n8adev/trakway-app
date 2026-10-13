-- Technicians onboarded by admin.
--   technician_photo / shop_photo: public paths under /uploads/technicians/
--   id_proof_photo: private key under storage/private/ (e.g. "technicians/x.jpg"),
--                   served only through GET /api/admin/technicians/:id/id-proof
CREATE TABLE technicians (
  id               BIGSERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  mobile           VARCHAR(10)  NOT NULL,  -- 10-digit Indian mobile, without +91
  email            VARCHAR(255),
  address          TEXT         NOT NULL,
  state            VARCHAR(60)  NOT NULL,
  pincode          CHAR(6)      NOT NULL,
  technician_photo VARCHAR(500) NOT NULL,
  shop_photo       VARCHAR(500) NOT NULL,
  id_proof_photo   VARCHAR(500) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX technicians_mobile_unique ON technicians (mobile);
CREATE UNIQUE INDEX technicians_email_unique ON technicians (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX technicians_pincode_idx ON technicians (pincode);
