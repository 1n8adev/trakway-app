import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// Public address of the website, used for canonical URLs, Open Graph and structured data.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.trakwaytechnologies.com').replace(/\/$/, '');

export const SITE_NAME = 'Trakway Technologies';

// Default 1200×630 share image (app/api/og/route.tsx), used when a page has no image of its own.
export const DEFAULT_OG_IMAGE = { url: `${SITE_URL}/api/og`, width: 1200, height: 630, alt: SITE_NAME };

const OG_LOCALES: Record<string, string> = { en: 'en_IN', hi: 'hi_IN', ta: 'ta_IN' };

type PageMetadataInput = {
  locale: string;
  // Path after the locale, e.g. "" (home), "/about", "/product/tw-10".
  path: string;
  // Page title. `absoluteTitle` skips the " | Trakway Technologies" suffix (for custom SEO titles).
  title: string;
  absoluteTitle?: boolean;
  description?: string;
  keywords?: string[];
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  canonical?: string;
  noindex?: boolean;
};

// Full <head> metadata for a public page: title, description, canonical + language alternates,
// and the complete Open Graph / Twitter set (og:title, og:description, og:image, og:url, og:type,
// og:site_name, og:locale). A page that sets openGraph replaces the layout's, so every page builds
// the whole set through here.
export function pageMetadata(input: PageMetadataInput): Metadata {
  const url = `${SITE_URL}/${input.locale}${input.path}`;
  const shareTitle = input.absoluteTitle || !input.path ? input.title : `${input.title} | ${SITE_NAME}`;
  const images = input.images?.length ? input.images : [DEFAULT_OG_IMAGE];
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    keywords: input.keywords?.length ? input.keywords : undefined,
    alternates: {
      canonical: input.canonical ?? url,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${input.path}`]))
    },
    // Only ever adds noindex; it never overrides the site-wide setting in the locale layout.
    ...(input.noindex && { robots: { index: false, follow: true } }),
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALES[input.locale] ?? 'en_IN',
      alternateLocale: routing.locales.filter((l) => l !== input.locale).map((l) => OG_LOCALES[l]),
      title: shareTitle,
      description: input.description,
      images
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: input.description,
      images: images.map((image) => image.url)
    }
  };
}

export type SeoScript = {
  // External script (https only — enforced by the API) or inline code.
  src?: string;
  content?: string;
  async: boolean;
  defer: boolean;
  type?: string;
  id?: string;
};

const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ATTRIBUTE = /([a-zA-Z][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

// Turns the admin's "Google tag / tracking scripts" snippet (<script> tags only, validated by the API)
// into script descriptors the page renders with next/script.
export function parseSeoScripts(snippet: string | null | undefined): SeoScript[] {
  if (!snippet) return [];
  const scripts: SeoScript[] = [];
  for (const [, rawAttributes, body] of snippet.matchAll(SCRIPT_TAG)) {
    const attrs: Record<string, string> = {};
    for (const [, name, dq, sq, bare] of rawAttributes.matchAll(ATTRIBUTE)) {
      attrs[name.toLowerCase()] = (dq ?? sq ?? bare ?? '').trim();
    }
    const src = attrs.src && /^https:\/\//i.test(attrs.src) ? attrs.src : undefined;
    const content = body.trim();
    if (!src && !content) continue;
    scripts.push({
      src,
      content: src ? undefined : content,
      async: 'async' in attrs,
      defer: 'defer' in attrs,
      type: attrs.type || undefined,
      id: attrs.id || undefined
    });
  }
  return scripts;
}

// generateMetadata for a fixed page whose title/description live in messages "Meta":
// `${key}Title` / `${key}Description`. key null = home page (site title, no suffix).
//   export const generateMetadata = staticPageMetadata('/about', 'about');
export function staticPageMetadata(path: string, key: string | null) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Meta' });
    return key
      ? pageMetadata({ locale, path, title: t(`${key}Title`), description: t(`${key}Description`) })
      : pageMetadata({ locale, path, title: t('siteTitle'), absoluteTitle: true, description: t('siteDescription') });
  };
}
