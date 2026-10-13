CREATE TABLE categories (
  id          BIGSERIAL PRIMARY KEY,
  parent_id   BIGINT REFERENCES categories (id) ON DELETE RESTRICT,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(180) NOT NULL UNIQUE,
  description TEXT,
  image       VARCHAR(500),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);
