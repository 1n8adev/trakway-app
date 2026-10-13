-- Reusable attributes, e.g. "SIM" -> [Vodafone Sim, Airtel Sim], "Recharge Plan" -> [1 Year, 2 Year].
CREATE TABLE attributes (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX attributes_name_unique ON attributes (LOWER(name));

CREATE TABLE attribute_values (
  id           BIGSERIAL PRIMARY KEY,
  attribute_id BIGINT NOT NULL REFERENCES attributes (id) ON DELETE CASCADE,
  value        VARCHAR(100) NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX attribute_values_value_unique ON attribute_values (attribute_id, LOWER(value));

-- A priced combination of attribute values for a product, e.g. Vodafone Sim + 1 Year = 4000.
-- combination_key is the sorted attribute_value ids ("3-7") so a product can't repeat a combination.
CREATE TABLE product_variants (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  combination_key VARCHAR(255) NOT NULL,
  price           NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  sku             VARCHAR(100),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- DEFERRABLE: checked at commit, so one save can swap combinations between variants.
  CONSTRAINT product_variants_combination_unique UNIQUE (product_id, combination_key) DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX product_variants_sku_unique ON product_variants (LOWER(sku)) WHERE sku IS NOT NULL;

-- The attribute values that make up each variant (one value per attribute).
-- RESTRICT: an attribute value used by a variant can't be deleted.
CREATE TABLE product_variant_values (
  variant_id         BIGINT NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  attribute_id       BIGINT NOT NULL REFERENCES attributes (id) ON DELETE RESTRICT,
  attribute_value_id BIGINT NOT NULL REFERENCES attribute_values (id) ON DELETE RESTRICT,
  PRIMARY KEY (variant_id, attribute_id)
);

CREATE INDEX product_variant_values_value_idx ON product_variant_values (attribute_value_id);
