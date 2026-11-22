-- Purchases: supplier bills entered by Trakway (what we bought, from whom, at what rate).
-- Prices are exclusive of GST; the API calculates every amount the same way as vendor invoices.
-- Supplier in our state (INVOICE_SELLER_STATE) → CGST + SGST, else IGST.
CREATE TABLE purchases (
  id             BIGSERIAL PRIMARY KEY,
  supplier_id    BIGINT        NOT NULL REFERENCES suppliers (id) ON DELETE RESTRICT,
  bill_no        VARCHAR(50)   NOT NULL,  -- the supplier's invoice number
  bill_date      DATE          NOT NULL,
  bill_file      VARCHAR(255),            -- private storage key of the uploaded bill (PDF / image); never returned
  bill_file_name VARCHAR(255),            -- original file name, for downloads
  intra_state    BOOLEAN        NOT NULL,
  subtotal       NUMERIC(12, 2) NOT NULL,
  cgst           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sgst           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  igst           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tax      NUMERIC(12, 2) NOT NULL,
  round_off      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total    NUMERIC(12, 2) NOT NULL,
  notes          TEXT,                    -- internal
  created_by     BIGINT REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The same supplier bill can't be entered twice.
CREATE UNIQUE INDEX purchases_bill_unique ON purchases (supplier_id, UPPER(bill_no));
CREATE INDEX purchases_date_idx ON purchases (bill_date DESC, id DESC);

-- Lines keep their own copy of the supplier product's name / HSN / GST at the time of the purchase.
CREATE TABLE purchase_items (
  id                  BIGSERIAL PRIMARY KEY,
  purchase_id         BIGINT         NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
  supplier_product_id BIGINT         NOT NULL REFERENCES supplier_products (id) ON DELETE RESTRICT,
  name                VARCHAR(150)   NOT NULL,
  hsn_code            VARCHAR(8)     NOT NULL,
  quantity            NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_price          NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  gst_rate            NUMERIC(5, 2)  NOT NULL CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  taxable_value       NUMERIC(12, 2) NOT NULL,
  tax_amount          NUMERIC(12, 2) NOT NULL,
  line_total          NUMERIC(12, 2) NOT NULL,
  sort_order          INTEGER        NOT NULL DEFAULT 0
);

CREATE INDEX purchase_items_purchase_idx ON purchase_items (purchase_id, sort_order);
CREATE INDEX purchase_items_product_idx ON purchase_items (supplier_product_id);
