import { getTranslations } from 'next-intl/server';
import { fetchFaqs, type Faq } from '@/lib/api';
import FaqAccordion from '@/components/FaqAccordion';

// FAQs come from GET /api/faqs. If the backend is unreachable the section is
// skipped rather than taking the whole page down with it.
export default async function FaqSection() {
  const t = await getTranslations('Faq');

  let items: Faq[] = [];
  try {
    items = await fetchFaqs();
  } catch (error) {
    console.error('Failed to load FAQs', error);
  }

  if (items.length === 0) return null;

  return (
    <section id="faq" className="py-8">
      <div className="mx-auto lg:max-w-7xl px-4">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-brand-600">{t('label')}</p>
            <h2 className="mt-2 max-w-sm text-3xl font-extrabold text-gray-900 sm:text-4xl">{t('heading')}</h2>
          </div>

          <FaqAccordion items={items} />
        </div>
      </div>
    </section>
  );
}
