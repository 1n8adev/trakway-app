'use client';

import { useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';
import { getCartSnapshot, subscribeToCart } from '@/lib/cart';

// Cart icon with the total quantity; the badge appears once the cart has items.
export default function HeaderCart() {
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => null);
  const count = cart?.summary.quantityTotal ?? 0;

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className="relative text-gray-500 hover:text-ink-700"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.5-1.2l1.6-6.8H6.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
