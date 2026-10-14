-- Client logos shown on the website ("Our Clients"). image is a /uploads/client-logos/... path.
CREATE TABLE client_logos (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  image      VARCHAR(500) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX client_logos_sort_idx ON client_logos (sort_order, id);
