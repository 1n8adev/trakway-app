-- Per-product SEO, edited in the admin "SEO" tab and used by the website product details page.
-- Empty values fall back to the product's own name / short description on the website.
ALTER TABLE products
  ADD COLUMN seo_title         VARCHAR(160),
  ADD COLUMN seo_keywords      VARCHAR(500),
  ADD COLUMN seo_description   VARCHAR(320),
  ADD COLUMN seo_canonical_url VARCHAR(500),
  ADD COLUMN seo_noindex       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN seo_scripts       TEXT;  -- <script> tags only (e.g. Google tag / conversion snippet)
