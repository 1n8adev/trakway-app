'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { AuthApiError } from '@/lib/auth';
import { clearCart, getCartSnapshot, refreshCart, removeCartItem, subscribeToCart, updateCartItem, type CartItem } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { useAuthSession } from '@/components/auth/useAuthSession';
import AddressForm from '@/components/account/AddressForm';
import { formatAddress, listAddresses, type Address } from '@/lib/addresses';

const MAX_QUANTITY = 99;
const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h1.5v-8H10Zm3.5 0v8H15v-8h-1.5Z" />
    </svg>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      // On success the row re-renders from the store (or unmounts on remove).
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const stepButton =
    'flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <li className={`flex gap-4 py-6 first:pt-0 last:pb-0 sm:gap-5 ${pending ? 'opacity-70' : ''}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-32 sm:w-32">
        <Image
          src={item.image ?? PLACEHOLDER_IMAGE}
          alt={item.name}
          fill
          sizes="128px"
          className={`object-contain p-2 ${item.available ? '' : 'grayscale'}`}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 sm:text-lg">{item.name}</h3>
            {item.variantLabel && (
              <p className="mt-1 text-sm text-gray-500">
                <span className="text-gray-700">Plan:</span> {item.variantLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => run(() => removeCartItem(item.id))}
            disabled={pending}
            aria-label={`Remove ${item.name} from cart`}
            className="shrink-0 rounded-md p-1 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {!item.available && (
          <p className="mt-2 text-sm font-medium text-red-600">{item.message ?? 'This item is currently unavailable.'}</p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-xl font-bold text-gray-900 sm:text-2xl">{formatPrice(item.lineTotal)}</p>
            {item.quantity > 1 && <p className="text-xs text-gray-500">{formatPrice(item.finalPrice)} each</p>}
            {item.price > item.finalPrice && item.quantity === 1 && (
              <p className="text-xs text-gray-400 line-through">{formatPrice(item.price)}</p>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-full bg-gray-50 px-1.5 py-1 ring-1 ring-gray-200">
            <button
              type="button"
              onClick={() => run(() => updateCartItem(item.id, item.quantity - 1))}
              disabled={pending || item.quantity <= 1}
              aria-label="Decrease quantity"
              className={stepButton}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-gray-900" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => run(() => updateCartItem(item.id, item.quantity + 1))}
              disabled={pending || item.quantity >= MAX_QUANTITY || !item.available}
              aria-label="Increase quantity"
              className={stepButton}
            >
              +
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'discount' | 'free' }) {
  const color = tone === 'discount' ? 'text-red-500' : tone === 'free' ? 'text-green-600' : 'text-gray-900';
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-bold ${color}`}>{value}</dd>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-10">{children}</div>;
}

export default function CartView() {
  const session = useAuthSession();
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  // Saved addresses: an order needs one, so checkout waits until one exists.
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressError, setAddressError] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  function loadAddresses() {
    return listAddresses()
      .then((list) => {
        setAddresses(list);
        setAddressError(false);
      })
      .catch(() => setAddressError(true));
  }

  // Always fetch fresh prices/stock when the cart page opens.
  const loggedIn = Boolean(session);
  useEffect(() => {
    if (!loggedIn) return;
    refreshCart().catch((err) => setLoadError(errorMessage(err)));
    loadAddresses();
  }, [loggedIn]);

  if (session === undefined || (session && !cart && !loadError)) {
    return (
      <div className="grid gap-6 lg:grid-cols-12" aria-busy="true">
        <div className="h-80 animate-pulse rounded-2xl bg-gray-100 lg:col-span-7" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100 lg:col-span-5" />
      </div>
    );
  }

  if (!session) {
    return (
      <Panel>
        <p className="text-lg font-bold text-gray-900">Log in to see your cart</p>
        <p className="mt-1 text-gray-500">Your cart is saved to your Trakway account.</p>
        <Link
          href="/auth?tab=login&next=/cart"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Log in
        </Link>
      </Panel>
    );
  }

  if (!cart) {
    return (
      <Panel>
        <p className="text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            refreshCart().catch((err) => setLoadError(errorMessage(err)));
          }}
          className="mt-4 rounded-full border-2 border-brand-600 px-6 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-600 hover:text-white"
        >
          Try again
        </button>
      </Panel>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Panel>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-14 w-14 text-gray-300" aria-hidden="true">
          <path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.5-1.2l1.6-6.8H6.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.5" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-900">Your cart is empty</p>
        <p className="mt-1 text-gray-500">Find the right GPS tracker for your vehicle.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Browse products
        </Link>
      </Panel>
    );
  }

  const { summary } = cart;
  const hasUnavailable = summary.unavailableCount > 0;
  const deliveryAddress = addresses?.find((a) => a.is_default) ?? addresses?.[0] ?? null;
  const needsAddress = addresses !== null && addresses.length === 0;
  // If addresses failed to load, let checkout handle it rather than blocking here.
  const canCheckout = !hasUnavailable && !needsAddress && (addresses !== null || addressError);

  async function handleClear() {
    if (!window.confirm('Remove all items from your cart?')) return;
    setClearing(true);
    try {
      await clearCart();
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <ul className="divide-y divide-gray-200">
            {cart.items.map((item) => (
              <CartRow key={item.id} item={item} />
            ))}
          </ul>

          <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear cart'}
            </button>
          </div>
        </div>

        {addingAddress && (
          <section id="delivery-address" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900">Add a delivery address</h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">It’s saved to your account as your default address.</p>
            <AddressForm
              forceDefault={addresses?.length === 0}
              defaultName={session.user?.name ?? ''}
              defaultPhone={session.user?.phone ?? ''}
              onSaved={async () => {
                setAddingAddress(false);
                await loadAddresses();
              }}
              onCancel={() => setAddingAddress(false)}
            />
          </section>
        )}
      </div>

      <aside className="rounded-2xl border border-gray-200 bg-white p-6 lg:sticky lg:top-6 lg:col-span-5">
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Order Summary</h2>

        <dl className="mt-6 space-y-4">
          <SummaryRow label={`Price (${summary.quantityTotal} item${summary.quantityTotal === 1 ? '' : 's'})`} value={formatPrice(summary.mrpTotal)} />
          {summary.savings > 0 && <SummaryRow label="Discount" value={`- ${formatPrice(summary.savings)}`} tone="discount" />}
          <SummaryRow label="Delivery Fee" value="Free" tone="free" />
          <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <dt className="font-semibold text-gray-900">Total</dt>
            <dd className="text-2xl font-bold text-gray-900">{formatPrice(summary.subtotal)}</dd>
          </div>
        </dl>

        {summary.savings > 0 && (
          <p className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
            You save {formatPrice(summary.savings)} on this order
          </p>
        )}

        {hasUnavailable && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
            Remove {summary.unavailableCount === 1 ? 'the unavailable item' : `${summary.unavailableCount} unavailable items`} to
            continue.
          </p>
        )}

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-900">Deliver to</p>
            {deliveryAddress && (
              <Link href="/account/addresses" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Change
              </Link>
            )}
          </div>
          {addressError ? (
            <p className="mt-2 text-sm text-red-600">Could not load your addresses.</p>
          ) : addresses === null ? (
            <div className="mt-2 h-10 animate-pulse rounded bg-gray-200" />
          ) : deliveryAddress ? (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">
                {deliveryAddress.name} · {deliveryAddress.phone}
              </p>
              <p className="mt-0.5 leading-relaxed">{formatAddress(deliveryAddress)}</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Add a delivery address to continue to checkout.</p>
              {!addingAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setAddingAddress(true);
                    requestAnimationFrame(() =>
                      document.getElementById('delivery-address')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    );
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-brand-600 px-4 py-1.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-600 hover:text-white"
                >
                  <span className="text-base leading-none">+</span> Add address
                </button>
              )}
            </div>
          )}
        </div>

        {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}

        {!canCheckout ? (
          <span className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full bg-gray-300 px-6 py-4 text-sm font-semibold text-white">
            Go to Checkout
          </span>
        ) : (
          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-ink-700 px-6 py-4 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Go to Checkout
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        )}

        <p className="mt-4 text-center text-xs text-gray-500">Inclusive of all taxes · Free shipping across India</p>
      </aside>
    </div>
  );
}
