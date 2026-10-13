'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { listAddresses, type Address } from '@/lib/addresses';
import { getCartSnapshot, subscribeToCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { UserInfo } from '@/components/auth/HeaderAccount';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

function Card({
  icon,
  title,
  action,
  children
}: {
  icon: BookServiceIcon;
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <BookServiceIconGlyph icon={icon} className="h-5 w-5" />
          </span>
          {title}
        </h2>
        {action && (
          <Link href={action.href} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

export default function AccountOverview() {
  const session = useAuthSession();
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressError, setAddressError] = useState(false);

  useEffect(() => {
    listAddresses()
      .then(setAddresses)
      .catch(() => setAddressError(true));
  }, []);

  if (!session?.user) return null;
  const defaultAddress = addresses?.find((a) => a.is_default) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Hi, {session.user.name.split(' ')[0]}</h2>
        <p className="mt-1 text-gray-500">Manage your profile, addresses and cart.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card icon="user" title="Profile">
          <UserInfo session={session} />
        </Card>

        <Card icon="pin" title="Default address" action={{ href: '/account/addresses', label: 'Manage' }}>
          {addressError ? (
            <p className="text-sm text-red-600">Could not load your addresses.</p>
          ) : !addresses ? (
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ) : defaultAddress ? (
            <div className="text-sm leading-relaxed text-gray-600">
              <p className="font-semibold text-gray-900">{defaultAddress.name}</p>
              <p className="mt-1">
                {defaultAddress.address_line1}
                {defaultAddress.address_line2 && `, ${defaultAddress.address_line2}`}
              </p>
              <p>
                {defaultAddress.city}, {defaultAddress.state} - {defaultAddress.pincode}
              </p>
              <p className="mt-1">{defaultAddress.phone}</p>
              {addresses.length > 1 && (
                <p className="mt-3 text-xs text-gray-400">+ {addresses.length - 1} more saved</p>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <p>You haven’t saved an address yet. You’ll need one to place an order.</p>
              <Link
                href="/account/addresses"
                className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700"
              >
                Add address
              </Link>
            </div>
          )}
        </Card>

        <Card icon="clipboard" title="Cart" action={{ href: '/cart', label: 'View cart' }}>
          {cart && cart.summary.quantityTotal > 0 ? (
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">
                  {cart.summary.quantityTotal} item{cart.summary.quantityTotal === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(cart.summary.subtotal)}</p>
              </div>
              {cart.summary.savings > 0 && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Saving {formatPrice(cart.summary.savings)}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Your cart is empty.{' '}
              <Link href="/products" className="font-semibold text-brand-600 hover:text-brand-700">
                Browse products
              </Link>
            </p>
          )}
        </Card>

        <Card icon="calendar" title="Book a service" action={{ href: '/book-service', label: 'Book now' }}>
          <p className="text-sm text-gray-500">
            GPS installation, replacement or troubleshooting — our technicians come to your doorstep.
          </p>
        </Card>
      </div>
    </div>
  );
}
