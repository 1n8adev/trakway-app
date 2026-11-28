-- Online payment with Razorpay, alongside Cash on Delivery.
-- A Razorpay order starts as status 'pending_payment' (cart untouched); a verified payment moves it to
-- 'placed' + payment_status 'paid' and empties the cart. Unpaid ones are cancelled after a while.
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'));

ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'razorpay'));

ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

ALTER TABLE orders
  ADD COLUMN razorpay_order_id VARCHAR(40),
  ADD COLUMN paid_at           TIMESTAMPTZ;

CREATE UNIQUE INDEX orders_razorpay_order_unique ON orders (razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX orders_pending_payment_idx ON orders (created_at) WHERE status = 'pending_payment';

-- Every Razorpay payment attempt for an order (failed ones too), as last reported by Razorpay.
CREATE TABLE order_payments (
  id                  BIGSERIAL PRIMARY KEY,
  order_id            BIGINT NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  razorpay_payment_id VARCHAR(40) NOT NULL UNIQUE,
  razorpay_order_id   VARCHAR(40) NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL,            -- rupees
  currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
  status              VARCHAR(20) NOT NULL,               -- created | authorized | captured | failed | refunded
  method              VARCHAR(20),                        -- card | upi | netbanking | wallet | emi | ...
  details             JSONB NOT NULL DEFAULT '{}',        -- vpa, bank, wallet, card network/last4, email, contact
  error_code          VARCHAR(100),
  error_description   VARCHAR(500),
  signature_verified  BOOLEAN NOT NULL DEFAULT FALSE,     -- checkout handler signature checked
  captured_at         TIMESTAMPTZ,
  refund_id           VARCHAR(40),
  refund_amount       NUMERIC(12, 2),
  refund_status       VARCHAR(20),                        -- pending | processed | failed
  refunded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX order_payments_order_idx ON order_payments (order_id, created_at DESC);
