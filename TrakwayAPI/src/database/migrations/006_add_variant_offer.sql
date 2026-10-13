-- Optional offer per combination:
--   offer_type 'price'      -> offer_value is the selling price (e.g. price 4000, offer 3500)
--   offer_type 'percentage' -> offer_value is % off price  (e.g. 10 -> 3600)
--   both NULL               -> no offer
ALTER TABLE product_variants
  ADD COLUMN offer_type  VARCHAR(10),
  ADD COLUMN offer_value NUMERIC(12, 2),
  ADD CONSTRAINT product_variants_offer_type_check CHECK (offer_type IN ('price', 'percentage')),
  ADD CONSTRAINT product_variants_offer_pair_check CHECK ((offer_type IS NULL) = (offer_value IS NULL)),
  ADD CONSTRAINT product_variants_offer_value_check CHECK (
    offer_type IS NULL
    OR (offer_type = 'price' AND offer_value >= 0 AND offer_value < price)
    OR (offer_type = 'percentage' AND offer_value > 0 AND offer_value < 100)
  );
