-- Products as each supplier sells them to Trakway (their name, our purchase rate, HSN, GST).
CREATE TABLE supplier_products (
  id          BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT         NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  name        VARCHAR(150)   NOT NULL,  -- the supplier's item name / code, as on their invoice
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),  -- purchase rate before GST
  hsn_code    VARCHAR(8)     NOT NULL,  -- 4 to 8 digits
  gst_rate    NUMERIC(5, 2)  NOT NULL CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A name is unique within one supplier (two suppliers may both sell a "4G Unit").
CREATE UNIQUE INDEX supplier_products_name_unique ON supplier_products (supplier_id, LOWER(name));
