import Image from 'next/image';
import type { ProductBenefit } from '@/lib/products';
import { CheckIcon } from './icons';

export default function ProductBenefits({ benefits }: { benefits: ProductBenefit[] }) {
  if (benefits.length === 0) return null;

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-100 text-brand-600">
            {benefit.image ? (
              <Image src={benefit.image} alt="" fill sizes="44px" className="object-contain p-2" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </span>
          <h3 className="mt-4 font-bold text-gray-900">{benefit.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{benefit.description}</p>
        </div>
      ))}
    </div>
  );
}
