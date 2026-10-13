'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { AuthApiError } from '@/lib/auth';
import { fetchOrder, type Order } from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { BillingAddress, GstDetails } from './OrderBilling';

const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';

export default function OrderConfirmation({ orderNo }: { orderNo: string | null }) {
  const session = useAuthSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loggedIn = Boolean(session);

  useEffect(() => {
    if (!loggedIn || !orderNo) return;
    fetchOrder(orderNo)
      .then(setOrder)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'Could not load your order.'));
  }, [loggedIn, orderNo]);

  if (!orderNo || error || session === null) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-lg font-bold text-gray-900">{error ?? 'Order not found'}</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-brand-600 hover:text-brand-700">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-gray-100" aria-busy="true" />;
  }

  const savings = Math.max(0, order.mrp_total - order.subtotal) + order.coupon_discount;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-gray-900 sm:text-3xl">Order placed successfully!</h1>
        <p className="mt-2 text-gray-600">
          Thank you, {order.ship_name.split(' ')[0]}. Your order <strong className="text-gray-900">{order.order_no}</strong> has
          been received. A confirmation has been sent to your email.
        </p>
        <p className="mt-4 inline-block rounded-full bg-brand-50 px-5 py-2 text-sm font-semibold text-brand-700">
          Pay {formatPrice(order.total)} in cash on delivery
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-bold text-gray-900">Shipping to</h2>
          <address className="mt-3 text-sm leading-relaxed text-gray-600 not-italic">
            <span className="font-semibold text-gray-900">{order.ship_name}</span>
            <br />
            {order.ship_address_line1}
            {order.ship_address_line2 && `, ${order.ship_address_line2}`}
            {order.ship_landmark && (
              <>
                <br />
                {order.ship_landmark}
              </>
            )}
            <br />
            {order.ship_city}, {order.ship_state} - {order.ship_pincode}
            <br />
            {order.ship_phone}
          </address>
          <h2 className="mt-5 border-t border-gray-100 pt-4 font-bold text-gray-900">Billing to</h2>
          <BillingAddress order={order} />
          <GstDetails order={order} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-bold text-gray-900">Payment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Subtotal</dt>
              <dd className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.coupon_discount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Coupon ({order.coupon_code})</dt>
                <dd className="font-semibold text-red-500">- {formatPrice(order.coupon_discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Shipping</dt>
              <dd className="font-semibold text-green-600">{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-2">
              <dt className="font-semibold text-gray-900">Total (Cash on Delivery)</dt>
              <dd className="font-bold text-gray-900">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          {savings > 0 && <p className="mt-3 text-sm font-medium text-green-700">You saved {formatPrice(savings)}</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold text-gray-900">Items</h2>
        <ul className="mt-4 divide-y divide-gray-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image src={item.image ?? PLACEHOLDER_IMAGE} alt={item.product_name} fill sizes="64px" className="object-contain p-1" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-gray-900">{item.product_name}</p>
                {item.variant_label && <p className="text-gray-500">{item.variant_label}</p>}
                <p className="text-gray-500">
                  {item.quantity} × {formatPrice(item.final_price)}
                </p>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatPrice(item.line_total)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/products"
          className="rounded-full bg-brand-600 px-8 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Continue shopping
        </Link>
        <Link
          href={`/account/orders/${order.order_no}`}
          className="rounded-full border-2 border-brand-600 px-8 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-600 hover:text-white"
        >
          View order
        </Link>
      </div>
    </div>
  );
}
