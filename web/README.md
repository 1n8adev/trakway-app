# Next.js Multi-language Mini E-commerce (English / Tamil / Hindi)

A minimal example: home, product list, product details (backed by a REST
API), and a contact page — translated via [next-intl].

**Stack (latest stable as of Aug 2026):** Next.js 16.3.1 (Turbopack, App
Router) · React 19.2.8 · next-intl 4.13.7 · Tailwind CSS 4.3.3 · TypeScript
7.0.2.

## Run it

```bash
npm install
npm run dev
```

Then open:
- http://localhost:3000/en — English
- http://localhost:3000/ta — Tamil
- http://localhost:3000/hi — Hindi

Visiting `/` redirects to a locale automatically (based on the browser's
`Accept-Language` header, falling back to `en`). This redirect is handled by
`proxy.ts` — Next.js 16's replacement for `middleware.ts`.

## Pages

| Route                     | Purpose                                              |
|----------------------------|-------------------------------------------------------|
| `/[locale]`                 | **Home** — hero banner + featured products, links to Shop |
| `/[locale]/products`        | **Product list** — full catalog grid                 |
| `/[locale]/product/[id]`    | **Product details** — single product                 |
| `/[locale]/contact`         | **Contact us** — a simple form (name/email/message)   |

e.g. in Tamil: `/ta`, `/ta/products`, `/ta/product/clay-mug`, `/ta/contact`.

## How the i18n is wired (next-intl v4)

next-intl v4 splits configuration into a small `i18n/` folder instead of one
flat file:

- **`i18n/routing.ts`** — `defineRouting({...})`: the list of supported
  locale codes and the default locale. This is the single place you edit to
  add/remove a language.
- **`i18n/navigation.ts`** — `createNavigation(routing)`: locale-aware
  `Link`, `useRouter`, `usePathname` so links automatically keep (or switch)
  the current language prefix.
- **`i18n/request.ts`** — loads the right `messages/*.json` file per
  request, using next-intl's async `requestLocale`.
- **`proxy.ts`** — Next.js 16's network-boundary file (renamed from
  `middleware.ts`). Detects/redirects to the right locale.
- **`messages/en.json`, `messages/ta.json`, `messages/hi.json`** — the UI
  string translations, grouped by namespace (`Header`, `Nav`, `Home`,
  `ProductList`, `ProductDetails`, `Contact`).
- **`components/LocaleSwitcher.tsx`** — the dropdown in the header that lets
  a visitor switch languages without losing their place.

## Product data via the backend API

Product data comes from the Trakway backend (`API_URL`, default
`http://localhost:5000`; see `.env.local.example`). Server Components call it
through `lib/api.ts`:

| Page | Endpoint | Helper |
| --- | --- | --- |
| Home — "Our Products" | `GET /api/products/latest?limit=8` | `fetchLatestProducts` |
| Products — category tabs | `GET /api/categories` | `fetchCategories` |
| Products — grid ("All" tab omits `category`) | `GET /api/products?category=…&page=1&limit=12` | `fetchProducts` |
| Product details | `GET /api/products/{slug}` | `fetchProduct` |

Every request sends `lang=en` (and `Accept-Language: en`) — English is the
default content language. `lib/products.ts` holds the UI types and maps the
backend's raw JSON to them (relative `/uploads/...` paths become absolute
image URLs; HTML spec/package tables are parsed into plain rows).

Because product data (stock, price) is live rather than static, the pages
under `app/[locale]/` are rendered dynamically (`export const dynamic =
'force-dynamic'` in `app/[locale]/layout.tsx`) rather than statically
generated at build time.

## Adding another language (e.g. French)

1. Add `'fr'` to `locales` in `i18n/routing.ts`, and add an entry to
   `localeNames`.
2. Create `messages/fr.json` (copy `messages/en.json` and translate).

That's it — `proxy.ts`, the switcher, and pages all pick it up automatically.

## Project structure

```
app/
  layout.tsx                       # minimal root layout (required by Next.js)
  [locale]/
    layout.tsx                     # provides translations + renders Header
    page.tsx                       # Home ("/")
    products/page.tsx              # Product list ("/products")
    product/[id]/page.tsx          # Product details ("/product/clay-mug")
    contact/page.tsx               # Contact us ("/contact")
components/
  Header.tsx                       # nav bar (Home/Products/Contact) + switcher
  LocaleSwitcher.tsx
  ProductCard.tsx
  ContactForm.tsx                  # client component, handles the contact form
lib/
  products.ts                      # product types + backend JSON → UI mapping
  api.ts                           # fetch() client for the backend API
messages/
  en.json / ta.json / hi.json      # UI translations
i18n/
  routing.ts                       # locale list (defineRouting)
  navigation.ts                    # locale-aware Link/router (createNavigation)
  request.ts                       # per-request message loading
proxy.ts                           # locale detection/routing (was middleware.ts)
```

## Wiring the contact form up for real

`components/ContactForm.tsx` currently simulates a submission with a
`setTimeout`. To make it actually send messages, replace that with a call to
an API route (e.g. `app/api/contact/route.ts`) that emails you via
[Resend](https://resend.com), or point the `fetch` at a service like
[Formspree](https://formspree.io).
