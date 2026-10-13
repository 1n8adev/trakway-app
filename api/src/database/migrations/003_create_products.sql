CREATE TABLE products (
  id                BIGSERIAL PRIMARY KEY,
  category_id       BIGINT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(220) NOT NULL UNIQUE,
  feature           VARCHAR(255),                       -- e.g. "2G GPS, All Vehicles"
  short_description TEXT,
  long_description  TEXT,
  feature_list      JSONB NOT NULL DEFAULT '[]'::JSONB,  -- e.g. ["Live Tracking", "Android App"]
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Names are unique regardless of case.
CREATE UNIQUE INDEX products_name_unique ON products (LOWER(name));
CREATE INDEX products_category_id_idx ON products (category_id);

-- Gallery; the lowest sort_order is the main image.
CREATE TABLE product_images (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  image      VARCHAR(500) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_images_product_id_idx ON product_images (product_id, sort_order);

-- "Features and Benefits" blocks: image + title + description.
CREATE TABLE product_benefits (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  image       VARCHAR(500),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX product_benefits_product_id_idx ON product_benefits (product_id, sort_order);
