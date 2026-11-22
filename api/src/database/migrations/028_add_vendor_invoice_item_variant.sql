-- The combination (e.g. "1 Year") sold on a vendor invoice product line. Required by the API when the product
-- has active combinations; accessory and custom lines never have one. Stock is still counted per product.
ALTER TABLE vendor_invoice_items
  ADD COLUMN variant_id BIGINT REFERENCES product_variants (id) ON DELETE SET NULL;
