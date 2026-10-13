import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ProductCard from '@/components/ProductCard';
import type { Pagination, ProductCategory, ProductSummary } from '@/lib/products';

function chipClass(active: boolean) {
  return `cursor-pointer rounded-full border px-5 py-2.5 text-base font-semibold transition ${
    active
      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
  }`;
}

const pageLinkClass =
  'rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand-600 hover:text-brand-600';

export default function ProductCatalog({
  products,
  categories,
  pagination,
  basePath,
  activeSlug,
  allLabel,
  emptyMessage
}: {
  products: ProductSummary[];
  categories: ProductCategory[];
  pagination: Pagination;
  // Listing path the pagination links stay on, e.g. "/products" or "/products/vehicle-tracking".
  basePath: string;
  activeSlug?: string;
  allLabel: string;
  emptyMessage: string;
}) {
  const t = useTranslations('ProductList');
  const { page, totalPages } = pagination;
  const pageHref = (n: number) => (n > 1 ? `${basePath}?page=${n}` : basePath);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/products" className={chipClass(!activeSlug)}>
          {allLabel}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/products/${category.slug}`}
            className={chipClass(
              activeSlug === category.slug || category.children.some((c) => c.slug === activeSlug)
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-gray-500">{emptyMessage}</p>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-4" aria-label={t('pagination')}>
          {page > 1 && (
            <Link href={pageHref(page - 1)} className={pageLinkClass}>
              ← {t('previous')}
            </Link>
          )}
          <span className="text-sm text-gray-500">{t('pageOf', { page, totalPages })}</span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className={pageLinkClass}>
              {t('next')} →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
