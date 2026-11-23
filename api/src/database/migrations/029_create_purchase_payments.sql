-- Purchase payments: money Trakway sends a supplier against one of their bills (purchases).
-- A bill can be paid in parts; the API keeps the total paid at or below the bill's grand_total.
CREATE TABLE purchase_payments (
  id           BIGSERIAL PRIMARY KEY,
  purchase_id  BIGINT         NOT NULL REFERENCES purchases (id) ON DELETE RESTRICT,
  paid_on      DATE           NOT NULL,
  amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method       VARCHAR(20)    NOT NULL CHECK (method IN ('bank_transfer', 'upi', 'cash', 'cheque', 'other')),
  reference    VARCHAR(100),             -- UTR / UPI ref / cheque no
  notes        TEXT,                     -- internal
  created_by   BIGINT REFERENCES admin_users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX purchase_payments_purchase_idx ON purchase_payments (purchase_id, paid_on, id);
CREATE INDEX purchase_payments_date_idx ON purchase_payments (paid_on DESC, id DESC);
