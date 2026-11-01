import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

// Thin announcement strip shown above the main header on every page.
export default function PreHeader() {
  const t = useTranslations('PreHeader');

  return (
    <div className="border-b border-brand-100 bg-brand-50 px-4 py-3 text-center text-sm font-medium text-ink-700">
      {t('message')}{' '}
      <Link href="/products" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
        {t('cta')}
      </Link>
    </div>
  );
}
