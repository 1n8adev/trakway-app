import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import Header from '@/components/Header';
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

export const metadata: Metadata = {
  title: {
    template: '%s | Trakway Technologies',
    default: 'Trakway Technologies – GPS Vehicle Tracking Solutions'
  },
  icons: {
    icon: '/images/favicon.png'
  },
  // TEMPORARY: keep the site out of search engines until launch. Remove this line to allow indexing.
  robots: { index: false }
};

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
          <Header />
          <main className="mx-auto py-0">{children}</main>
          <Footer />
          <FloatingActions />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
