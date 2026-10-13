-- specifications: [{ "title": "General", "rows": [{ "label": "Network", "value": "2G GSM" }] }]
-- package_details / box_contents: sanitized HTML from the admin rich-text editor.
ALTER TABLE products
  ADD COLUMN specifications  JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN package_details TEXT,
  ADD COLUMN box_contents    TEXT;
