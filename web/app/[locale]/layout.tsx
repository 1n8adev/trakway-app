import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { SITE_NAME, SITE_URL, pageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import Header from '@/components/Header';
import PreHeader from '@/components/PreHeader';
import Footer from '@/components/Footer';
import FloatingActions from '@/components/FloatingActions';
import '../globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta'
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Site-wide defaults. Public pages override title/description/Open Graph via pageMetadata()
// (lib/seo.ts); private pages (account, cart, checkout) inherit these share tags.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Meta' });
  const home = pageMetadata({ locale, path: '', title: t('siteTitle'), description: t('siteDescription') });
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      template: `%s | ${SITE_NAME}`,
      default: t('siteTitle')
    },
    description: t('siteDescription'),
    openGraph: home.openGraph,
    twitter: home.twitter,
    icons: {
      icon: '/images/favicon.png'
    },
    // TEMPORARY: keep the site out of search engines until launch. Remove this line to allow indexing.
    robots: { index: false }
  };
}

// Pages under here call the backend API at request time (live stock/price
// data), which can't be resolved during `next build` since no server is
// running yet to answer that fetch. Rendering these dynamically (on each
// request, with the `revalidate: 60` cache set in lib/api.ts) is the right
// trade-off for a catalog that changes — swap to static + ISR if you'd
// rather pre-render and revalidate on a timer instead.
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  // Next.js 16: route params are now a Promise and must be awaited.
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} className={plusJakartaSans.variable}>
      <body className="min-h-screen overflow-x-hidden antialiased">
        <NextIntlClientProvider locale={locale as Locale} messages={messages}>
          <PreHeader />
          <Header />
          <main className="mx-auto py-0">{children}</main>
          <Footer />
          <FloatingActions />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
