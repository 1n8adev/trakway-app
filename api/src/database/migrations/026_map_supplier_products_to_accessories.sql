-- Which Trakway accessory a supplier product is (the supplier's name for it can differ).
-- One accessory can come from several supplier products (several suppliers); a supplier product maps to at most one.
-- Later the same table gets the link to Trakway products / variants.
ALTER TABLE supplier_products
  ADD COLUMN accessory_id BIGINT REFERENCES product_accessories (id) ON DELETE SET NULL;

CREATE INDEX supplier_products_accessory_idx ON supplier_products (accessory_id) WHERE accessory_id IS NOT NULL;
