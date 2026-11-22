-- Product accessories master (Admin > Catalog > Accessories), picked as vendor invoice lines.
-- price is the rate before GST (same as an invoice line's unit_price).
CREATE TABLE product_accessories (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(150)   NOT NULL,
  price      NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  hsn_code   VARCHAR(8)     NOT NULL,  -- 4 to 8 digits
  gst_rate   NUMERIC(5, 2)  NOT NULL CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX product_accessories_name_unique ON product_accessories (LOWER(name));

-- An invoice line is a product, an accessory, or custom text (neither) — never both.
ALTER TABLE vendor_invoice_items
  ADD COLUMN accessory_id BIGINT REFERENCES product_accessories (id) ON DELETE SET NULL,
  ADD CONSTRAINT vendor_invoice_items_one_source CHECK (product_id IS NULL OR accessory_id IS NULL);
