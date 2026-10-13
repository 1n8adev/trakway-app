-- Customer addresses. One default per user (partial unique index).
CREATE TABLE user_addresses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(10)  NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  landmark      VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(60)  NOT NULL,
  pincode       CHAR(6)      NOT NULL,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_addresses_user_idx ON user_addresses (user_id);
CREATE UNIQUE INDEX user_addresses_one_default ON user_addresses (user_id) WHERE is_default;

-- Cart lines. variant_id is required for products sold through combinations.
-- Deleting a product / combination removes it from carts.
CREATE TABLE cart_items (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id BIGINT  NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  variant_id BIGINT  REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX cart_items_line_unique ON cart_items (user_id, product_id, COALESCE(variant_id, 0));

-- Discount coupons (admin). code is stored upper-case.
CREATE TABLE coupons (
  id               BIGSERIAL PRIMARY KEY,
  code             VARCHAR(30) NOT NULL,
  description      VARCHAR(255),
  discount_type    VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value   NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  max_discount     NUMERIC(12, 2) CHECK (max_discount > 0),        -- cap for percentage coupons
  min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  starts_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  usage_limit      INTEGER CHECK (usage_limit > 0),                 -- total uses, NULL = unlimited
  per_user_limit   INTEGER CHECK (per_user_limit > 0),              -- uses per customer, NULL = unlimited
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_percentage_max CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CONSTRAINT coupons_dates CHECK (starts_at IS NULL OR expires_at IS NULL OR expires_at > starts_at)
);

CREATE UNIQUE INDEX coupons_code_unique ON coupons (UPPER(code));

-- Orders. Address, prices and item names are copied at checkout so later edits don't change them.
CREATE TABLE orders (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status           VARCHAR(20) NOT NULL DEFAULT 'placed'
                   CHECK (status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method   VARCHAR(20) NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod')),
  payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  subtotal         NUMERIC(12, 2) NOT NULL,   -- sum of item final prices x quantity
  mrp_total        NUMERIC(12, 2) NOT NULL,   -- sum of item list prices x quantity (for "you saved")
  coupon_id        BIGINT REFERENCES coupons (id) ON DELETE SET NULL,
  coupon_code      VARCHAR(30),
  coupon_discount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  shipping_fee     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total            NUMERIC(12, 2) NOT NULL,
  ship_name        VARCHAR(100) NOT NULL,
  ship_phone       VARCHAR(10)  NOT NULL,
  ship_address_line1 VARCHAR(255) NOT NULL,
  ship_address_line2 VARCHAR(255),
  ship_landmark    VARCHAR(255),
  ship_city        VARCHAR(100) NOT NULL,
  ship_state       VARCHAR(60)  NOT NULL,
  ship_pincode     CHAR(6)      NOT NULL,
  customer_note    VARCHAR(500),
  admin_notes      TEXT,
  cancel_reason    VARCHAR(255),
  confirmed_at     TIMESTAMPTZ,
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status, created_at DESC);
CREATE INDEX orders_coupon_idx ON orders (coupon_id);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id    BIGINT REFERENCES products (id) ON DELETE SET NULL,
  variant_id    BIGINT REFERENCES product_variants (id) ON DELETE SET NULL,
  product_name  VARCHAR(200) NOT NULL,
  product_slug  VARCHAR(220),
  variant_label VARCHAR(255),
  sku           VARCHAR(100),
  image         VARCHAR(500),
  unit_price    NUMERIC(12, 2) NOT NULL,   -- list price
  final_price   NUMERIC(12, 2) NOT NULL,   -- price paid per unit after the product/variant offer
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  line_total    NUMERIC(12, 2) NOT NULL
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
