'use client';

import { useState, type ReactNode } from 'react';
import type { ProductAttribute, ProductVariant } from '@/lib/products';
import { formatPrice } from '@/lib/format';
import AddToCart from './AddToCart';

export function PriceLine({ price, originalPrice }: { price: number; originalPrice?: number }) {
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-2">
      <span className="text-2xl font-bold text-gray-900 sm:text-3xl">{formatPrice(price)}</span>
      {originalPrice && <span className="text-lg text-gray-400 line-through">{formatPrice(originalPrice)}</span>}
    </p>
  );
}

function optionClass(selected: boolean) {
  return `cursor-pointer rounded-xl border px-5 py-3 text-sm font-semibold text-gray-900 transition disabled:cursor-not-allowed disabled:opacity-40 ${
    selected
      ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100'
      : 'border-gray-200 bg-white hover:border-gray-400'
  }`;
}

// Price line + option buttons for a product with variants. The price shown at the
// top follows the selected combination; `children` renders between the two
// (shipping note, description), matching the details page layout.
export default function ProductVariantPicker({
  productId,
  attributes,
  variants,
  chooseLabel,
  unavailableLabel,
  addToCartLabel,
  addToCartExtra,
  children
}: {
  productId: number;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  chooseLabel: string;
  unavailableLabel: string;
  addToCartLabel: string;
  addToCartExtra?: ReactNode;
  children: ReactNode;
}) {
  const [selection, setSelection] = useState<Record<number, number>>(variants[0]?.selection ?? {});

  const selected = variants.find((v) => attributes.every((a) => v.selection[a.id] === selection[a.id]));

  // Options cascade top to bottom: the values offered for an attribute are the
  // ones that exist in a sold combination with the choices made above it.
  // E.g. with only "Airtel + 1 Year", "Vodafone + 1 Year" and "Airtel + 2 Years"
  // sold, picking Vodafone leaves just "1 Year" under Recharge.
  function availableValues(index: number, sel: Record<number, number>) {
    const above = attributes.slice(0, index);
    const ids = new Set(
      variants
        .filter((v) => above.every((a) => v.selection[a.id] === sel[a.id]))
        .map((v) => v.selection[attributes[index].id])
    );
    return attributes[index].values.filter((value) => ids.has(value.id));
  }

  function choose(index: number, valueId: number) {
    const next = { ...selection, [attributes[index].id]: valueId };
    // Keep each later choice if it still forms a sold combination, else take the first that does.
    for (let k = index + 1; k < attributes.length; k++) {
      const options = availableValues(k, next);
      if (!options.some((o) => o.id === next[attributes[k].id]) && options[0]) next[attributes[k].id] = options[0].id;
    }
    setSelection(next);
  }

  // "Sim" → "Choose Sim", but an attribute already named "Choose Sim" is left as is.
  const heading = (name: string) =>
    name.toLowerCase().startsWith(chooseLabel.toLowerCase()) ? name : `${chooseLabel} ${name}`;

  return (
    <>
      {selected ? (
        <PriceLine price={selected.price} originalPrice={selected.originalPrice} />
      ) : (
        <p className="mt-3 text-lg font-semibold text-gray-500">{unavailableLabel}</p>
      )}

      {children}

      <div className="mt-6">
        {attributes.map((attribute, index) => (
          <div key={attribute.id} className="mb-5 last:mb-0">
            <h3 className="text-sm font-bold tracking-wider text-gray-500 uppercase">{heading(attribute.name)}</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {availableValues(index, selection).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(index, option.id)}
                  aria-pressed={selection[attribute.id] === option.id}
                  className={optionClass(selection[attribute.id] === option.id)}
                >
                  {option.value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Keyed by variant so quantity and "Added" reset when the option changes. */}
      <AddToCart key={selected?.id ?? 'none'} productId={productId} variantId={selected?.id} label={addToCartLabel} extra={addToCartExtra} />
    </>
  );
}
