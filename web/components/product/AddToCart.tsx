'use client';

import { useState, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { AuthApiError } from '@/lib/auth';
import { addToCart } from '@/lib/cart';

const MAX_QUANTITY = 99;

// Quantity stepper + "Add to cart". `variantId` is null for products without
// variants, and undefined when the chosen option combination isn't sold.
export default function AddToCart({
  productId,
  variantId,
  label,
  extra
}: {
  productId: number;
  variantId: number | null | undefined;
  label: string;
  // Rendered at the end of the button row (e.g. the WhatsApp button).
  extra?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  const [error, setError] = useState<string | null>(null);

  const unavailable = variantId === undefined;

  function changeQuantity(next: number) {
    setQuantity(Math.min(MAX_QUANTITY, Math.max(1, next || 1)));
    setStatus('idle');
  }

  async function handleAdd() {
    if (unavailable) return;
    setStatus('adding');
    setError(null);
    try {
      await addToCart({ productId, variantId, quantity });
      setStatus('added');
    } catch (err) {
      setStatus('idle');
      if (err instanceof AuthApiError && err.status === 401) {
        // Send them back to this product once they've logged in.
        router.push(`/auth?tab=login&next=${encodeURIComponent(pathname)}`);
        return;
      }
      setError(err instanceof AuthApiError ? err.message : 'Could not add to cart. Please try again.');
    }
  }

  const stepButton =
    'flex h-full w-11 items-center justify-center text-lg font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex h-12 items-center overflow-hidden rounded-full border-2 border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => changeQuantity(quantity - 1)}
            disabled={quantity <= 1 || unavailable}
            aria-label="Decrease quantity"
            className={stepButton}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_QUANTITY}
            value={quantity}
            onChange={(e) => changeQuantity(Number(e.target.value))}
            disabled={unavailable}
            aria-label="Quantity"
            className="h-full w-12 [appearance:textfield] border-x border-gray-200 text-center text-sm font-bold text-gray-900 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => changeQuantity(quantity + 1)}
            disabled={quantity >= MAX_QUANTITY || unavailable}
            aria-label="Increase quantity"
            className={stepButton}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={unavailable || status === 'adding'}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink-700 px-8 text-sm font-bold tracking-wider text-white uppercase transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
            <path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.5-1.2l1.6-6.8H6.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.5" cy="20" r="1.5" />
            <circle cx="17" cy="20" r="1.5" />
          </svg>
          {status === 'adding' ? 'Adding…' : label}
        </button>
        {extra}
      </div>

      <div aria-live="polite">
        {status === 'added' && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-green-700">
            <span className="font-semibold">✓ Added to your cart.</span>
            <Link href="/cart" className="font-semibold text-brand-600 underline hover:text-brand-700">
              View cart
            </Link>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
