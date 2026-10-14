import { htmlToParagraphs } from './html';
import {
  toAssetUrl,
  toCategory,
  toProductDetails,
  toProductSummary,
  type Pagination,
  type ProductCategory,
  type ProductDetails,
  type ProductSummary,
  type RawCategory,
  type RawProductDetails,
  type RawProductSummary
} from './products';

// Base URL of the Trakway backend. Server-only (no NEXT_PUBLIC_ prefix): every
// call goes through Server Components, so the browser never talks to it directly.
export const API_URL = (process.env.API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

// Content language requested from the backend. English by default.
const DEFAULT_LANG = 'en';

// Catalog data is cached for a minute so pages stay fast without going stale.
const REVALIDATE_SECONDS = 60;

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination?: Pagination;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  lang = DEFAULT_LANG
): Promise<ApiEnvelope<T>> {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set('lang', lang);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'Accept-Language': lang },
    next: { revalidate: REVALIDATE_SECONDS }
  });

  if (!res.ok) {
    throw new ApiError(res.status, `GET ${url.pathname} failed with ${res.status}`);
  }

  return res.json();
}

// GET /api/products/latest?limit=8 — "Our Products" on the home page.
export async function fetchLatestProducts(limit = 8): Promise<ProductSummary[]> {
  const { data } = await apiGet<RawProductSummary[]>('/api/products/latest', { limit });
  return data.map((p) => toProductSummary(p, API_URL));
}

// GET /api/categories — filter tabs on the products page.
export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data } = await apiGet<RawCategory[]>('/api/categories');
  return data.map(toCategory);
}

// GET /api/products?category=vehicle-tracking&page=1&limit=12
// Omit `category` for the "All" tab. A category filter also includes its sub-categories.
export async function fetchProducts(
  opts: { category?: string; page?: number; limit?: number } = {}
): Promise<{ products: ProductSummary[]; pagination: Pagination }> {
  const { category, page = 1, limit = 12 } = opts;
  const { data, pagination } = await apiGet<RawProductSummary[]>('/api/products', { category, page, limit });

  return {
    products: data.map((p) => toProductSummary(p, API_URL)),
    pagination: pagination ?? { page, limit, total: data.length, totalPages: 1 }
  };
}

// GET /api/products/{slug} — returns null on 404 so the page can render not-found.
export async function fetchProduct(slug: string): Promise<ProductDetails | null> {
  try {
    const { data } = await apiGet<RawProductDetails>(`/api/products/${encodeURIComponent(slug)}`);
    return toProductDetails(data, API_URL);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

// Finds a category (or sub-category) by slug anywhere in the tree.
export function findCategoryBySlug(categories: ProductCategory[], slug: string): ProductCategory | undefined {
  for (const category of categories) {
    if (category.slug === slug) return category;
    const child = findCategoryBySlug(category.children, slug);
    if (child) return child;
  }
  return undefined;
}

export type Faq = {
  id: number;
  question: string;
  // Answer split into plain-text paragraphs (authored as HTML in the admin).
  answer: string[];
};

// GET /api/faqs — FAQ section on the home and product details pages.
export async function fetchFaqs(): Promise<Faq[]> {
  const { data } = await apiGet<{ id: number; question: string; answer: string | null }[]>('/api/faqs');
  return data.map((faq) => ({ id: faq.id, question: faq.question, answer: htmlToParagraphs(faq.answer) }));
}

export type ClientLogo = {
  id: number;
  name: string;
  // Absolute URL of the logo on the backend.
  image: string;
};

// GET /api/client-logos — active logos for the home page strip, in display order.
export async function fetchClientLogos(): Promise<ClientLogo[]> {
  const { data } = await apiGet<{ id: number; name: string; image: string }[]>('/api/client-logos');
  return data.flatMap((logo) => {
    const image = toAssetUrl(logo.image, API_URL);
    return image ? [{ id: logo.id, name: logo.name, image }] : [];
  });
}

export type BookingOption = { value: string; label: string };

export type ServiceBookingOptions = {
  vehicle_types: BookingOption[];
  services: BookingOption[];
  time_slots: BookingOption[];
  states: string[];
};

// GET /api/service-bookings/options — dropdown values for the booking form.
export async function fetchServiceBookingOptions(): Promise<ServiceBookingOptions> {
  const { data } = await apiGet<ServiceBookingOptions>('/api/service-bookings/options');
  return data;
}

export type ServiceBookingInput = {
  vehicle_type: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  state: string;
};

