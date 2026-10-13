import { getTranslations } from 'next-intl/server';
import { fetchLatestProducts } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import HeroVideo from '@/components/HeroVideo';
import ClientLogos from '@/components/ClientLogos';
import ServicesSection from '@/components/ServicesSection';
import BookingSection from '@/components/BookingSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';

export default async function HomePage() {
  const t = await getTranslations('Home');
  const latest = await fetchLatestProducts(8);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative left-1/2 right-1/2 -mx-[50vw] mb-12 w-screen bg-cover bg-center md:py-16 pb-0 text-center"
        style={{ backgroundImage: "url('/images/banner-bg.png')" }}
      >
        <h1 className="text-4xl font-extrabold text-gray-900 lg:text-6xl">
          <span className="block">{t('heroTitleLine1')}</span>
          <span className="block">{t('heroTitleLine2')}</span>
        </h1>
        <p className="mx-auto mt-3 text-gray-900 sm:text-lg">
          {t('heroSubtitlePart1')}
          <span className="text-brand-600">{t('heroSubtitlePart2')}</span>
          {t('heroSubtitlePart3')}
        </p>

        <div className="mt-8">
          <HeroVideo />
        </div>

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

      <ServicesSection />
      <BookingSection />
      <TestimonialsSection />
      <FaqSection />
    </div>
  );
}
