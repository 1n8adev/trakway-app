import { getTranslations } from 'next-intl/server';
import { fetchLatestProducts } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import ClientLogos from '@/components/ClientLogos';
import GpsDemoSection from '@/components/GpsDemoSection';
import FleetLiveSection from '@/components/FleetLiveSection';
import ServicesSection from '@/components/ServicesSection';
import BookingSection from '@/components/BookingSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import { staticPageMetadata } from '@/lib/seo';

// <title>, description, canonical and Open Graph / Twitter share tags (lib/seo.ts).
export const generateMetadata = staticPageMetadata('', null);

export default async function HomePage() {
  const t = await getTranslations('Home');
  const latest = await fetchLatestProducts(8);

  return (
    <div>
      {/* Hero: live fleet map. Previous hero backed up in backup/home-page-before-fleet-hero.tsx.bak */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] mb-12 w-screen text-center">
        <FleetLiveSection hero />

        <ClientLogos />
      </section>

      {/* Latest products — fetched from GET /api/products/latest?limit=8 */}
      <section>
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 md:text-5xl">
            {t('productsHeadingPart1')}
            <span className="text-brand-600">{t('productsHeadingPart2')}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-900">
            <span className="block">{t('productsSubtitleLine1')}</span>
            <span className="block">{t('productsSubtitleLine2')}</span>
          </p>
        </div>
        <div className="mx-auto lg:max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {latest.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        </div>
       
      </section>

      {/* <GpsDemoSection /> */}
      <ServicesSection />
      <BookingSection />
      <TestimonialsSection />
      <FaqSection />
    </div>
  );
}
