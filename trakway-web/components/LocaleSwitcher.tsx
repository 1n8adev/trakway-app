'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, localeNames, type Locale } from '@/i18n/routing';

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = useLocale();

  function switchTo(nextLocale: Locale) {
    // next-intl's router understands the current (locale-less) pathname
    // and rebuilds the URL with the new locale prefix, e.g. /ta/product/clay-mug
    router.push(pathname, { locale: nextLocale });
  }

  return (
    <select
      aria-label="Change language"
      value={activeLocale}
      onChange={(e) => switchTo(e.target.value as Locale)}
      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
    >
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
