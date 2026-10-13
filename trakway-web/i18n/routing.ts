import { defineRouting } from 'next-intl/routing';

// 👉 Add or remove supported languages here.
// To add e.g. French later: add 'fr' below and create messages/fr.json
export const routing = defineRouting({
  locales: ['en', 'ta', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'always' // URLs look like /en/... /ta/...
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी'
};
