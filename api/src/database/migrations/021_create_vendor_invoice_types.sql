-- Vendor invoice types (Sales Invoice, Renewal Invoice, ...), managed in Admin > Settings.
-- Each type has its own number series per financial year: <prefix>/<FY>/0001.
-- name is printed as the PDF title. prefix is locked once the type has invoices.
CREATE TABLE vendor_invoice_types (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(60) NOT NULL,
  prefix     VARCHAR(10) NOT NULL,  -- uppercase letters, digits and "-"
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX vendor_invoice_types_name_unique ON vendor_invoice_types (LOWER(name));
CREATE UNIQUE INDEX vendor_invoice_types_prefix_unique ON vendor_invoice_types (UPPER(prefix));

INSERT INTO vendor_invoice_types (name, prefix, sort_order) VALUES
  ('Sales Invoice', 'TWV', 0),
  ('Renewal Invoice', 'TWR', 1);

-- Every existing invoice (all numbered TWV/...) becomes a Sales Invoice.
ALTER TABLE vendor_invoices ADD COLUMN type_id BIGINT REFERENCES vendor_invoice_types (id) ON DELETE RESTRICT;
UPDATE vendor_invoices SET type_id = (SELECT id FROM vendor_invoice_types WHERE prefix = 'TWV');
ALTER TABLE vendor_invoices ALTER COLUMN type_id SET NOT NULL;
CREATE INDEX vendor_invoices_type_idx ON vendor_invoices (type_id);

-- Sequences are now per type + financial year; the existing counters belong to Sales Invoice.
ALTER TABLE vendor_invoice_sequences ADD COLUMN type_id BIGINT REFERENCES vendor_invoice_types (id) ON DELETE CASCADE;
UPDATE vendor_invoice_sequences SET type_id = (SELECT id FROM vendor_invoice_types WHERE prefix = 'TWV');
ALTER TABLE vendor_invoice_sequences ALTER COLUMN type_id SET NOT NULL;
ALTER TABLE vendor_invoice_sequences DROP CONSTRAINT vendor_invoice_sequences_pkey;
ALTER TABLE vendor_invoice_sequences ADD PRIMARY KEY (type_id, financial_year);
