-- Website FAQs. answer is sanitized HTML from the admin text editor.
CREATE TABLE faqs (
  id         BIGSERIAL PRIMARY KEY,
  question   VARCHAR(500) NOT NULL,
  answer     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX faqs_question_unique ON faqs (LOWER(question));
CREATE INDEX faqs_sort_idx ON faqs (sort_order, id);
