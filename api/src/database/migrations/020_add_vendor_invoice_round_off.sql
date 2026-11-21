-- Grand total is rounded to the nearest rupee; round_off is the adjustment (between -0.50 and +0.50)
-- so that subtotal + total_tax + round_off = grand_total. Existing invoices keep 0 until edited.
ALTER TABLE vendor_invoices
  ADD COLUMN round_off NUMERIC(12, 2) NOT NULL DEFAULT 0;
