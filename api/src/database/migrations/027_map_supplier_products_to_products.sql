-- Which Trakway product a supplier product is. Stock is per product: combinations (e.g. 1 Year / 2 Years
-- plans) are Trakway's offers on the same hardware, so they all draw from the product's stock.
-- A supplier product is one Trakway item: an accessory OR a product, never both.
ALTER TABLE supplier_products
  ADD COLUMN product_id BIGINT REFERENCES products (id) ON DELETE SET NULL,
  ADD CONSTRAINT supplier_products_one_item CHECK (accessory_id IS NULL OR product_id IS NULL);

CREATE INDEX supplier_products_product_idx ON supplier_products (product_id) WHERE product_id IS NOT NULL;
