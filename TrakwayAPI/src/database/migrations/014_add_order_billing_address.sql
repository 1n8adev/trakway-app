-- Billing address snapshot on orders (copied at checkout, like the ship_* columns).
-- Optional company name + GSTIN for business (GST) invoices.
ALTER TABLE orders
  ADD COLUMN billing_same_as_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN bill_name          VARCHAR(100),
  ADD COLUMN bill_phone         VARCHAR(10),
  ADD COLUMN bill_address_line1 VARCHAR(255),
  ADD COLUMN bill_address_line2 VARCHAR(255),
  ADD COLUMN bill_landmark      VARCHAR(255),
  ADD COLUMN bill_city          VARCHAR(100),
  ADD COLUMN bill_state         VARCHAR(60),
  ADD COLUMN bill_pincode       CHAR(6),
  ADD COLUMN bill_company_name  VARCHAR(150),
  ADD COLUMN bill_gstin         CHAR(15);

-- Existing orders: billing = delivery address.
UPDATE orders SET
  bill_name = ship_name, bill_phone = ship_phone, bill_address_line1 = ship_address_line1,
  bill_address_line2 = ship_address_line2, bill_landmark = ship_landmark, bill_city = ship_city,
  bill_state = ship_state, bill_pincode = ship_pincode;

ALTER TABLE orders
  ALTER COLUMN bill_name SET NOT NULL,
  ALTER COLUMN bill_phone SET NOT NULL,
  ALTER COLUMN bill_address_line1 SET NOT NULL,
  ALTER COLUMN bill_city SET NOT NULL,
  ALTER COLUMN bill_state SET NOT NULL,
  ALTER COLUMN bill_pincode SET NOT NULL;
