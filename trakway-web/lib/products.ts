import { htmlToText } from './html';

// Types for the storefront's product data, plus the mapping from the backend's
// raw JSON (snake_case, HTML fields, relative upload paths) to the shapes the
// UI renders. Fetching lives in lib/api.ts.

export type ProductCategory = {
  id: number;
  name: string;
  // URL segment for the category's SEO-friendly listing page, /products/[slug].
  slug: string;
  children: ProductCategory[];
};

export type ProductSpecSection = {
  title: string;
  rows: { label: string; value: string }[];
};

export type ProductPackageRow = {
  label: string;
  value: string;
};

export type ProductBenefit = {
  title: string;
  description: string;
  image: string | null;
};

// Card-level data: what list endpoints (/api/products, /api/products/latest) return.
export type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  category: { name: string; slug: string } | null;
  price: number;
  // MRP shown struck-through next to the price when the product is discounted.
  originalPrice?: number;
  image: string;
  // Short pills shown above the product name, e.g. ["2G GPS", "All Vehicles"].
  badge: string[];
};

export type ProductAttribute = {
  id: number;
  name: string;
  values: { id: number; value: string }[];
};

export type ProductVariant = {
  id: number;
  label: string;
  price: number;
  // Pre-discount price, set only when the variant has an offer.
  originalPrice?: number;
  // attribute id → value id, e.g. { 3: 7 } for Sim = Airtel.
  selection: Record<number, number>;
};

export type ProductDetails = ProductSummary & {
  description: string;
  images: string[];
  // Short "at a glance" callouts shown as a 2-column icon grid, e.g. "1 Year Warranty".
  highlights: string[];
  specifications: ProductSpecSection[];
  benefits: ProductBenefit[];
  // "Package Details & Subscription Fee" tab, as a Feature/Details table.
  packageDetails: ProductPackageRow[];
  // "What's in the Box" tab: a Feature/Details table and/or a plain checklist,
  // depending on how the content was authored in the admin.
  boxContents: { rows: ProductPackageRow[]; items: string[] };
  // Option groups (e.g. SIM, recharge plan) and their priced combinations.
  // Empty when the product has no variants and sells at its base price.
  attributes: ProductAttribute[];
  variants: ProductVariant[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ---- Raw backend shapes ----------------------------------------------------

export type RawCategory = {
  id: number;
  name: string;
  slug: string;
  children?: RawCategory[];
};

export type RawProductSummary = {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  price: number;
  final_price: number;
  discount_amount: number;
  main_image: string | null;
  feature_tags: string[] | null;
  category: { id: number; name: string; slug: string } | null;
};

export type RawProductDetails = RawProductSummary & {
  long_description: string | null;
  feature_list: string[] | null;
  specifications: { title: string; description: string }[] | null;
  package_details: string | null;
  box_contents: string | null;
  images: { id: number; image: string }[] | null;
  benefits: { id: number; title: string; description: string; image: string | null }[] | null;
  has_variants: boolean;
  attributes:
    | { attribute_id: number; attribute: string; values: { value_id: number; value: string }[] }[]
    | null;
  variants:
    | {
        id: number;
        label: string;
        price: number;
        final_price: number;
        discount_amount: number;
        values: { attribute_id: number; value_id: number }[];
      }[]
    | null;
};

// ---- Mapping ----------------------------------------------------------------

const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';

// The backend returns upload paths relative to its own origin.
export function toAssetUrl(path: string | null | undefined, baseUrl: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function toCategory(raw: RawCategory): ProductCategory {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    children: (raw.children ?? []).map(toCategory)
  };
}

export function toProductSummary(raw: RawProductSummary, baseUrl: string): ProductSummary {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    shortDescription: raw.short_description ?? '',
    category: raw.category ? { name: raw.category.name, slug: raw.category.slug } : null,
    price: raw.final_price,
    originalPrice: raw.discount_amount > 0 ? raw.price : undefined,
    image: toAssetUrl(raw.main_image, baseUrl) ?? PLACEHOLDER_IMAGE,
    badge: raw.feature_tags ?? []
  };
}

export function toProductDetails(raw: RawProductDetails, baseUrl: string): ProductDetails {
  const summary = toProductSummary(raw, baseUrl);
  const images = (raw.images ?? [])
    .map((img) => toAssetUrl(img.image, baseUrl))
    .filter((src): src is string => src !== null);

  return {
    ...summary,
    description: raw.long_description || summary.shortDescription,
    images: images.length > 0 ? images : [summary.image],
    highlights: raw.feature_list ?? [],
    specifications: (raw.specifications ?? []).map((spec) => ({
      title: spec.title,
      rows: parseHtmlTable(spec.description)
    })),
    benefits: (raw.benefits ?? []).map((b) => ({
      title: b.title,
      description: b.description,
      image: toAssetUrl(b.image, baseUrl)
    })),
    packageDetails: parseHtmlTable(raw.package_details),
    boxContents: {
      rows: parseHtmlTable(raw.box_contents),
      items: parseHtmlList(raw.box_contents)
    },
    ...toVariantOptions(raw)
  };
}

function toVariantOptions(raw: RawProductDetails): Pick<ProductDetails, 'attributes' | 'variants'> {
  const variants = raw.has_variants ? (raw.variants ?? []) : [];
  if (variants.length === 0) return { attributes: [], variants: [] };

  return {
    attributes: (raw.attributes ?? []).map((a) => ({
      id: a.attribute_id,
      name: a.attribute,
      values: a.values.map((v) => ({ id: v.value_id, value: v.value }))
    })),
    variants: variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.final_price,
      originalPrice: v.discount_amount > 0 ? v.price : undefined,
      selection: Object.fromEntries(v.values.map((val) => [val.attribute_id, val.value_id]))
    }))
  };
}

// ---- Rich-text helpers --------------------------------------------------------
// Specs, package details and box contents are authored as HTML in the admin.
// Rather than injecting that HTML, pull out the table rows / list items as plain
// text so they render through the site's own styled tables.

// Two-column <td> rows become label/value pairs; header rows (<th>) are skipped.
function parseHtmlTable(html: string | null | undefined): ProductPackageRow[] {
  if (!html) return [];
  const rows: ProductPackageRow[] = [];
  for (const [, rowHtml] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => htmlToText(cell));
    if (cells.length >= 2) rows.push({ label: cells[0], value: cells.slice(1).join(' ') });
  }
  return rows;
}

function parseHtmlList(html: string | null | undefined): string[] {
  if (!html) return [];
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(([, item]) => htmlToText(item)).filter(Boolean);
}
