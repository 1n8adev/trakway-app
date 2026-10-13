import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/products';

export default function ProductCard({ product }: { product: ProductSummary }) {
  const t = useTranslations('Home');

  return (
    <div className="flex flex-col overflow-hidden   bg-white p-0 text-center">
      <div className="relative aspect-square w-full overflow-hidden">
        {product.badge.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
            {product.badge.map((label) => (
              <span
                key={label}
                className="rounded-md bg-ink-700 px-2 py-1 text-[10px] font-semibold text-white"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-contain border border-gray-200"
        />
      </div>
      <h3 className="mt-4 line-clamp-2 font-bold text-gray-900 text-xl md:text-2xl">{product.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-gray-500">{product.shortDescription}</p>
      <Link
        href={`/product/${product.slug}`}
        className="mx-auto mt-4 rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-900 transition hover:border-ink-700 hover:text-ink-700"
      >
        {t('buyNow')}
      </Link>
    </div>
  );
}
