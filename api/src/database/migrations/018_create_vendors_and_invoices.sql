-- Vendors (businesses we bill) and the GST tax invoices we raise to them from the admin panel.

CREATE TABLE vendors (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,  -- business / company name, printed as "Billed to"
  contact_person VARCHAR(100),
  mobile         VARCHAR(10)  NOT NULL,  -- 10-digit Indian mobile, without +91
  email          VARCHAR(255),
  gstin          VARCHAR(15),
  address        TEXT         NOT NULL,
  city           VARCHAR(60)  NOT NULL,
  state          VARCHAR(60)  NOT NULL,
  pincode        CHAR(6)      NOT NULL,
  notes          TEXT,                   -- internal, never printed
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX vendors_gstin_unique ON vendors (UPPER(gstin)) WHERE gstin IS NOT NULL;

-- invoice_no is assigned on create and never changes; numbers run per financial year (April–March),
-- in their own series, separate from website order invoices.
-- bill_* is a copy of the vendor at the time of the last save, so later vendor edits don't change
-- invoices already issued. Prices are exclusive of GST; amounts are calculated by the API.
CREATE TABLE vendor_invoices (
  id                  BIGSERIAL PRIMARY KEY,
  invoice_no          VARCHAR(30)  NOT NULL UNIQUE,
  vendor_id           BIGINT       NOT NULL REFERENCES vendors (id) ON DELETE RESTRICT,
  invoice_date        DATE         NOT NULL,
  due_date            DATE,
  bill_name           VARCHAR(150) NOT NULL,
  bill_contact_person VARCHAR(100),
  bill_mobile         VARCHAR(10)  NOT NULL,
  bill_email          VARCHAR(255),
  bill_gstin          VARCHAR(15),
  bill_address        TEXT         NOT NULL,
  bill_city           VARCHAR(60)  NOT NULL,
  bill_state          VARCHAR(60)  NOT NULL,
  bill_pincode        CHAR(6)      NOT NULL,
  intra_state         BOOLEAN      NOT NULL,  -- vendor in our state: CGST + SGST, else IGST
  subtotal            NUMERIC(12, 2) NOT NULL,
  cgst                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sgst                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  igst                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tax           NUMERIC(12, 2) NOT NULL,
  grand_total         NUMERIC(12, 2) NOT NULL,
  amount_paid         NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- sum of vendor_invoice_payments
  status              VARCHAR(20)  NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'cancelled')),
  notes               TEXT,  -- printed on the invoice
  terms               TEXT,  -- printed on the invoice
  cancelled_at        TIMESTAMPTZ,
  created_by          BIGINT REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vendor_invoices_vendor_idx ON vendor_invoices (vendor_id);
CREATE INDEX vendor_invoices_date_idx ON vendor_invoices (invoice_date DESC, id DESC);

-- A line is either a catalog product (product_id set, description copied from its name) or free text.
CREATE TABLE vendor_invoice_items (
  id            BIGSERIAL PRIMARY KEY,
  invoice_id    BIGINT NOT NULL REFERENCES vendor_invoices (id) ON DELETE CASCADE,
  product_id    BIGINT REFERENCES products (id) ON DELETE SET NULL,
  description   VARCHAR(500) NOT NULL,
  hsn_sac       VARCHAR(10),
  quantity      NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  gst_rate      NUMERIC(5, 2)  NOT NULL CHECK (gst_rate >= 0 AND gst_rate <= 28),
  taxable_value NUMERIC(12, 2) NOT NULL,
  tax_amount    NUMERIC(12, 2) NOT NULL,
  line_total    NUMERIC(12, 2) NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX vendor_invoice_items_invoice_idx ON vendor_invoice_items (invoice_id, sort_order);

CREATE TABLE vendor_invoice_payments (
  id         BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES vendor_invoices (id) ON DELETE CASCADE,
  paid_on    DATE NOT NULL,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method     VARCHAR(20) NOT NULL CHECK (method IN ('bank_transfer', 'upi', 'cash', 'cheque', 'other')),
  reference  VARCHAR(100),  -- UTR / cheque no.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vendor_invoice_payments_invoice_idx ON vendor_invoice_payments (invoice_id, paid_on);

-- Last vendor invoice number used per financial year, e.g. ('2026-27', 12).
CREATE TABLE vendor_invoice_sequences (
  financial_year VARCHAR(7) PRIMARY KEY,
  last_number    INTEGER NOT NULL DEFAULT 0
);
