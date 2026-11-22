-- Suppliers: businesses Trakway buys products from (the purchase side; vendors are who we sell to).
CREATE TABLE suppliers (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,  -- business / company name
  contact_person VARCHAR(100),
  mobile         VARCHAR(10)  NOT NULL,  -- 10-digit Indian mobile, without +91
  email          VARCHAR(255),
  gstin          VARCHAR(15),
  address        TEXT         NOT NULL,
  city           VARCHAR(60)  NOT NULL,
  state          VARCHAR(60)  NOT NULL,
  pincode        CHAR(6)      NOT NULL,
  notes          TEXT,                   -- internal
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX suppliers_gstin_unique ON suppliers (UPPER(gstin)) WHERE gstin IS NOT NULL;
