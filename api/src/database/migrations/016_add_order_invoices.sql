-- Tax invoices. invoice_no is assigned the first time an order's invoice is generated and never changes.
-- Numbers run consecutively within each Indian financial year (April–March), as GST requires.
ALTER TABLE orders
  ADD COLUMN invoice_no   VARCHAR(30),
  ADD COLUMN invoice_date TIMESTAMPTZ;

CREATE UNIQUE INDEX orders_invoice_no_unique ON orders (invoice_no) WHERE invoice_no IS NOT NULL;

-- Last invoice number used per financial year, e.g. ('2026-27', 41).
CREATE TABLE invoice_sequences (
  financial_year VARCHAR(7) PRIMARY KEY,
  last_number    INTEGER NOT NULL DEFAULT 0
);
