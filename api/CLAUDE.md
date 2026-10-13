# Trakway API

Node.js (Express) ecommerce API backed by PostgreSQL (`pg`, raw SQL), using JWT authentication.

## Commands

- `npm run dev` — start with auto-reload (`node --watch`)
- `npm start` — start the server
- `npm run db:check` — verify the PostgreSQL connection using `.env`
- `npm run migrate` — apply pending `.sql` files in `src/database/migrations`
- `npm run seed:admin -- <email> [password] [name]` — create an admin, or reset their password (random one printed if omitted)
- `npm run mail:check [-- to@email]` — verify SMTP login (and send a test email)

Health check: `GET /api/health` reports server and database status.

## Structure

```
src/
  server.js            entry: verify DB, start HTTP, graceful shutdown
  app.js               express app, global middleware, error handling
  config/              env.js (validated env), db.js (pool, query, withTransaction)
  routes/index.js      mounts /api/health, /api/admin, /api (website)
  modules/
    admin/
      admin.routes.js  /auth public; everything else behind authenticate + authorize('admin')
      auth/ category/ product/
    website/
      website.routes.js
  middlewares/         auth (authenticate, authorize), validate, notFound, errorHandler
  utils/               ApiError, asyncHandler, response, jwt, password, pagination, slugify
  database/            migrate.js, checkDb.js, migrations/*.sql, seeds/
uploads/               served at /uploads
```

## Module conventions

Each module folder has five files, with calls flowing one way:

`x.routes.js` → `x.validation.js` (via `middlewares/validate`) → `x.controller.js` → `x.service.js` → `x.repository.js`

- **routes**: URL + middleware wiring only.
- **controller**: reads `req`, calls service, responds with `utils/response`. Wrap handlers in `asyncHandler`.
- **service**: business rules; throw `ApiError.*` for expected failures.
- **repository**: the only layer that writes SQL. Always use parameterized queries (`$1`, `$2`).
- New migrations: `src/database/migrations/NNN_description.sql` (e.g. `001_create_admin_users.sql`); never edit an applied one.
- **Form-data / uploads**: create/update routes accept JSON or `multipart/form-data`. Chain `imageUpload('<folder>')` (middlewares/upload) → a module `normalize` middleware (converts strings with `utils/formData`, sets `body.image` from `req.file.publicPath`) → `validate()`. Images: JPG/PNG/WEBP/GIF, max 2 MB, saved to `uploads/<folder>/`. `errorHandler` deletes the uploaded file if the request fails; services call `removeUploadedFile()` when an image is replaced or its record deleted.
- JWT payload carries `type` (`'admin'` / `'customer'`) used by `authorize()`.

Config comes from `.env` (see `.env.example`); never commit `.env`. `CORS_ORIGINS` (comma-separated) restricts browser origins; empty allows all (development only — set it in production).

## Admin API scope (initial)

- Admin user login (JWT) — done: email + password, `POST /api/admin/auth/login`, `GET /api/admin/auth/me`
- Category module — done: nested via `parent_id`, name (case-insensitive) and slug must be unique (409 otherwise; slug defaults to slugified name), CRUD + `/tree` + `PATCH /:id/status` under `/api/admin/categories`
- Product module — done: `/api/admin/products`. The admin UI is tabbed, so there is one save endpoint per tab (no all-in-one PUT): `POST /` (Basic Information + images, creates), `PUT /:id/basic`, `PUT /:id/benefits`, `PUT /:id/specifications`, `PUT /:id/package-details`, `PUT /:id/box-contents`, plus `GET /`, `GET /:id`, `PATCH /:id/status`, `DELETE /:id`. Each endpoint keeps only its tab's fields (`FIELDS` in product.validation.js) and returns the full product. Tables `products` (name case-insensitive unique, slug unique, required `category_id`, `feature`, short/long description, `feature_list` JSONB string array, `specifications` JSONB `[{title, description}]` where description is editor HTML (the comment in migration 004 showing `rows` is outdated), `package_details` / `box_contents` rich-text HTML cleaned by `utils/html.cleanHtml`), `product_images` (min 2, max 10; lowest sort_order = main image), `product_benefits` (title, description, image). Form-data: gallery files in `images`, benefit image in `benefits[<i>][image]`; update appends `images`, deletes `remove_image_ids`, and replaces the whole `benefits` list when sent (send an existing benefit's `image` path to keep it). Image paths are never accepted from the client except to keep an existing benefit image. Category delete is refused while it has products.

- Attribute module — done: `/api/admin/attributes` (own controller). `attributes` (name unique) with `attribute_values` (value unique per attribute). CRUD + status for both; values under `/:id/values/:valueId`. Deleting an attribute/value used by any product combination is refused (409).
- Product combinations (variants) tab — done: `GET|PUT /api/admin/products/:id/variants`, code in `product/product-variant.{service,repository}.js`. `product_variants` (price NUMERIC(12,2), optional unique sku, `combination_key` = sorted value ids, unique per product, deferred) + `product_variant_values` (one value per attribute). PUT sends the whole list: items with `id` are updated, without `id` created, missing ones deleted — ids stay stable for future orders. All combinations of a product must use the same attribute set. `GET /products/:id` also returns `attributes` + `variants`.
- Variant offers — done: optional `offer_type` (`'price'` = offer_value is the selling price, must be < price; `'percentage'` = % off, 0 < x < 100) + `offer_value`; both null = no offer (DB CHECKs enforce it). Responses add computed `offer_price`, `final_price`, `discount_amount`, `discount_percent` (`pricing()` in product-variant.service.js) — always use `final_price` for what the customer pays.
- Product price — done: Basic Information has optional `price` + `offer_type`/`offer_value` (same rules as variant offers, migration 007) for products sold without combinations. Price/offer logic lives in `utils/pricing.js` (`pricing()`, `finalPriceSql()`), shared by products and variants. `PUT /:id/basic` re-checks offer vs price against stored values (`resolvePrice` in product.service.js); clearing price clears its offer. Product responses add `has_variants`; the list adds `variant_count`, `min_variant_price`, `max_variant_price` (active combinations, final prices). Cart rule (to build): `has_variants` → customer must pick a variant and pay its `final_price`; otherwise pay the product's `final_price` (product without price and without variants is not purchasable).
- FAQ module — done: `/api/admin/faqs` list (search, status, pagination), get, create, `PUT /:id`, `PATCH /:id/status`, `PUT /reorder` (`{ ids: [...] }` → sort_order 0..n), delete. `faqs` table: question (case-insensitive unique), answer (editor HTML via `cleanHtml`), sort_order (new FAQ goes last), is_active.
- Service bookings — done: `/api/admin/service-bookings` list (`status`, `search` incl. booking no "SB-000012", `service`, `vehicle_type`, `from`/`to` on preferred_date), `GET /summary` (counts per status), `GET /options`, `GET /:id`, `GET /:id/technicians` (active technicians nearest first: `match` pincode → area (first 3 pincode digits) → state → other, then fewest `open_jobs`), `PATCH /:id/assign` (`{technician_id, admin_notes?}` → status assigned; 409 if completed), `PATCH /:id/status` (`{status, technician_id?, admin_notes?}`), `PATCH /:id` (any of those; `technician_id: null` unassigns), delete. List filter `technician_id`. Status `open | assigned | completed`; "assigned" always needs a technician; re-opening removes the technician and clears `assigned_at`/`completed_at`. Bookings link to `technicians` via `technician_id` (migration 011 replaced free-text `assigned_to`); responses nest `technician {id,name,mobile,pincode,state,technician_photo,is_active} | null`. A technician with bookings can't be deleted (409); technician list adds `open_jobs`. Option lists (vehicle types, services, time slots, states, statuses) live in `src/constants/serviceBooking.js`; stored values are codes, responses add `*_label`.
- Technician onboarding — done: `/api/admin/technicians` list (`search` name/mobile/email/pincode, `state`, `status`), get, `POST` / `PUT /:id` (multipart; one image each in `technician_photo`, `shop_photo`, `id_proof_photo`, max 5 MB; a new photo replaces and deletes the old), `PATCH /:id/status`, delete (removes files). Mobile unique (normalized via `utils/phone.js`), email unique when set. **ID proof is private**: stored in `storage/private/technicians/` (not under `/uploads`, git-ignored), the DB key is never returned; responses give `id_proof_url` = `GET /api/admin/technicians/:id/id-proof` (admin token, `Cache-Control: private, no-store`). Upload middleware supports this via `imagesUpload(folder, { privateFields, maxMb })` → `file.privatePath`; errorHandler removes both public and private files on failure.
- Users (website customers) — done: `/api/admin/users` list (`search` name/email/phone, `status` active|inactive, `verified` true|false, `has_orders` true|false, `sort` newest|orders|spent|last_order; rows add `orders_count`, `active_orders`, `total_spent` (delivered), `last_order_at`), `GET /summary`, `GET /:id` (+ `active_sessions`, `order_stats` {counts per status, total_spent, pending_amount, coupon_savings, offer_savings, first/last_order_at, active_orders}, `cart` {lines, quantity}, `addresses`, `orders` — every order with its `items`), `PATCH /:id/status` (blocking revokes all refresh tokens; returns the same detail). password_hash is never selected.
- Coupons — done: `/api/admin/coupons` list (`search`, `status`; rows add `used_count`, `total_discount`, `state` active|scheduled|expired|used_up|inactive, `summary` text), get, create, `PUT /:id`, `PATCH /:id/status`, delete (409 if used in any order). `discount_type` percentage (≤100, optional `max_discount`) | fixed; `min_order_amount`, `starts_at`/`expires_at`, `usage_limit`, `per_user_limit`. Usage = non-cancelled orders with the coupon (no separate usage table). Rules in `utils/coupon.js` (`couponProblem`, `couponDiscount`).
- Orders — done: `/api/admin/orders` list (`status`, `payment_status`, `user_id`, `from`/`to` order date in IST, `search` order no "ORD-000012" / customer / delivery name, phone, pincode), `GET /summary`, `GET /:id` (+ items, `customer`, `next_statuses`), `PATCH /:id/status` (`{status, admin_notes?, cancel_reason?}`), `PATCH /:id` (`{admin_notes}`). Flow placed → confirmed → shipped → delivered; any of the first three → cancelled; delivered/cancelled are final. COD: delivered sets payment_status paid, cancelled sets it cancelled. Status updates are guarded against concurrent changes (409).
- `pg` returns NUMERIC as JS numbers and DATE as "YYYY-MM-DD" strings (type parsers in config/db.js).
- `middlewares/rateLimit.js` (`limitRequests`) for public forms; failed requests don't count. In production behind a proxy, set express `trust proxy` so limits use the real client IP.

## Website API (public, no auth) — mounted at `/api` via `modules/website/website.routes.js`

- `GET /api/categories` — visible category tree with `product_count` (includes sub-categories). Products page tabs.
- `GET /api/products/latest?limit=8` — newest visible products (home page; max 24).
- `GET /api/products?category=<slug>&search=&page=&limit=` — products page (default limit 12); category filter includes sub-categories.
- `GET /api/products/:slug` — details page: images, benefits, specifications, package_details, box_contents, `attributes` (option buttons, ordered by attribute/value sort_order) + sellable `variants`.
- `GET /api/faqs` — active FAQs `{ id, question, answer }` in sort_order.
- `GET /api/service-bookings/options` — dropdown lists for the booking form. `POST /api/service-bookings` — "Book a GPS Service" form (rate limited: 5 successful bookings / 15 min / IP); phone normalized to 10 digits, date must be today..+1 year (India time). Returns `booking_no`.
- Customer auth (`/api/auth`, `modules/website/auth/`): `POST /register` (name, email, phone?, password → creates unverified user, emails OTP) → `POST /register/verify` (email, otp → tokens); `POST /register/resend-otp`; `POST /login` (403 `errors.code = EMAIL_NOT_VERIFIED` if unverified); `POST /refresh` (rotates refresh token); `POST /logout`; `GET /me` (customer token); `POST /forgot-password` (always the same answer) → `POST /forgot-password/verify` (→ `reset_token`, 15 min, single-use via password fingerprint) → `POST /reset-password` (revokes all sessions). Tables (migration 012): `users`, `email_otps` (HMAC-hashed 6-digit codes, 10 min, 5 attempts, 60 s resend gap, 5/hour), `refresh_tokens` (sha256-hashed, 30 days, rotation; reuse of a rotated token after 30 s revokes all of that user's tokens). Access token = JWT `{id,email,type:'customer'}`, `CUSTOMER_ACCESS_EXPIRES_IN` (15m). Re-registering an unverified email updates it and sends a new code. Per-route IP limits (each route its own counter).
- Customer-only routes use `middlewares/requireCustomer.js` (customer JWT + account still active/verified; sets `req.customer`).
- Addresses (`/api/addresses`): list (default first), create (first one becomes default; max 10), `PUT /:id`, `PATCH /:id/default`, delete (deleting the default promotes the newest). One default per user (partial unique index).
- Cart (`/api/cart`): `GET`, `DELETE` (clear), `POST /items` (`{product_id, variant_id?, quantity?}` — variant_id required iff the product has sellable combinations; adding the same line again adds quantity, capped at 10), `PATCH /items/:id` (`{quantity}` 1–10), `DELETE /items/:id`. Every response is the full cart `{ items, summary }`, re-priced live; lines that became unavailable stay listed with `available:false` + `message` and are excluded from totals.
- Checkout & orders: `POST /api/checkout/summary` (`{coupon_code?}` → cart + `coupon` + `totals`; invalid coupon → 400 `errors.coupon_code`), `POST /api/orders` (`{address_id?` default address if omitted`, billing_address_id?, billing_same_as_shipping?, billing_company_name?, billing_gstin?, coupon_code?, note?}` → COD order from the whole cart; 409 if any line unavailable). Billing (migration 014): `bill_*` snapshot columns + `billing_same_as_shipping`; no billing_address_id (or `billing_same_as_shipping: true`, which wins) = copy of the delivery address; optional `bill_company_name` + `bill_gstin` (validated 15-char GSTIN, needs a company name). Emails show a "Billing details" block when billing differs or GST details are given. Placing runs in one transaction with the cart rows (`FOR UPDATE`) and coupon row locked; order stores address/item/price snapshots (`order_items`), then the cart is emptied. Confirmation email to the customer + copy to `ADMIN_ORDER_EMAIL` are sent after commit and never fail the order. `GET /api/orders`, `GET /api/orders/:orderNo` (ORD-000012), `POST /api/orders/:orderNo/cancel` (only while `placed`). Shipping is free (`SHIPPING_FEE` in website/order/order.service.js). Tables: migration 013.
- Email: `utils/mailer.js` (nodemailer, `SMTP_*`/`MAIL_FROM` in .env; without `SMTP_HOST` non-production prints emails to the console), templates in `utils/emailTemplates.js`, `npm run mail:check [-- to@email]` tests SMTP.
- Visibility rules live in `modules/website/visibility.js`: a product shows only if active and its category **and all ancestors** are active; a variant shows only if active and all its attributes/values are active.
- Cards/details add `feature_tags` (feature split on commas), `category {id,name,slug}`, `has_variants`, pricing fields, and `min_price`/`max_price` (variant range, or the product's final price).
- Website modules are read-only, so they have no `x.validation.js`. Shared response shaping: `utils/variants.js` (`formatVariant`, `summarizeAttributes`), `utils/pricing.js`.

More modules will be added later.
