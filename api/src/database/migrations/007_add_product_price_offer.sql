-- Price for products sold without combinations (variants). Optional: products with
-- combinations are priced per combination. Offer rules match product_variants (006).
ALTER TABLE products
  ADD COLUMN price       NUMERIC(12, 2),
  ADD COLUMN offer_type  VARCHAR(10),
  ADD COLUMN offer_value NUMERIC(12, 2),
  ADD CONSTRAINT products_price_check CHECK (price IS NULL OR price >= 0),
  ADD CONSTRAINT products_offer_type_check CHECK (offer_type IN ('price', 'percentage')),
  ADD CONSTRAINT products_offer_pair_check CHECK ((offer_type IS NULL) = (offer_value IS NULL)),
  ADD CONSTRAINT products_offer_value_check CHECK (
    offer_type IS NULL
    OR (price IS NOT NULL AND offer_type = 'price' AND offer_value >= 0 AND offer_value < price)
    OR (price IS NOT NULL AND offer_type = 'percentage' AND offer_value > 0 AND offer_value < 100)
  );
