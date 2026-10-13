'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { AuthApiError } from '@/lib/auth';
import { cancelOrder, canCancelOrder, fetchOrder, type Order, type OrderStatus } from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { FormAlert } from '@/components/auth/fields';
import { BillingAddress, GstDetails } from '@/components/checkout/OrderBilling';
import { OrderStatusBadge, PAYMENT_STATUS, formatOrderDateTime } from './orderUi';

const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';
const REASON_LIMIT = 255;

function errorMessage(error: unknown) {
  return error instanceof AuthApiError ? error.message : 'Something went wrong. Please try again.';
}

const STEPS: { status: Exclude<OrderStatus, 'cancelled'>; label: string; date: (o: Order) => string | null }[] = [
  { status: 'placed', label: 'Order placed', date: (o) => o.created_at },
  { status: 'confirmed', label: 'Confirmed', date: (o) => o.confirmed_at },
  { status: 'shipped', label: 'Shipped', date: (o) => o.shipped_at },
  { status: 'delivered', label: 'Delivered', date: (o) => o.delivered_at }
];

function Timeline({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        <p className="font-bold">Order cancelled{order.cancelled_at && ` on ${formatOrderDateTime(order.cancelled_at)}`}</p>
        {order.cancel_reason && <p className="mt-1">Reason: {order.cancel_reason}</p>}
      </div>
    );
  }

  const current = STEPS.findIndex((s) => s.status === order.status);

  return (
    <ol className="grid gap-4 sm:grid-cols-4 sm:gap-0">
      {STEPS.map((step, index) => {
        const done = index <= current;
        const date = done ? formatOrderDateTime(step.date(order)) : null;
        return (
          <li key={step.status} className="relative flex gap-3 sm:flex-col sm:items-center sm:text-center">
            {/* Connector to the next step */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-4 left-[calc(50%+1rem)] hidden h-0.5 w-[calc(100%-2rem)] sm:block ${
                  index < current ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                done ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span className="sm:mt-2">
              <span className={`block text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
              {date && <span className="block text-xs text-gray-500">{date}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CancelPanel({ order, onCancelled, onClose }: { order: Order; onCancelled: (o: Order) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      onCancelled(await cancelOrder(order.order_no, reason));
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
      <h2 className="font-bold text-gray-900">Cancel this order?</h2>
      <p className="mt-1 text-sm text-gray-600">This can’t be undone. You won’t be charged anything for a cancelled order.</p>
      {error && (
        <div className="mt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <label htmlFor="cancel_reason" className="mt-4 mb-1.5 block text-sm font-semibold text-gray-700">
        Reason <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        id="cancel_reason"
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, REASON_LIMIT))}
        rows={2}
        placeholder="Ordered by mistake, found a better option…"
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Keep order
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? 'Cancelling…' : 'Yes, cancel order'}
        </button>
      </div>
    </form>
  );
}

export default function OrderDetails({ orderNo }: { orderNo: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder(orderNo)
      .then(setOrder)
      .catch((err) => setError(errorMessage(err)));
  }, [orderNo]);

  const back = (
    <Link href="/account/orders" className="text-sm font-medium text-gray-500 hover:text-brand-600 mb-3 inline-block">
      ← Back to orders
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-bold text-gray-900">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6" aria-busy="true">
        {back}
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  const productDiscount = Math.max(0, order.mrp_total - order.subtotal);

  return (
    <div className="space-y-6">
      {back}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-extrabold text-gray-900">{order.order_no}</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">Placed on {formatOrderDateTime(order.created_at)}</p>
          </div>
          {canCancelOrder(order) && !cancelling && (
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setCancelling(true);
              }}
              className="rounded-full border-2 border-red-200 px-5 py-2 text-sm font-semibold text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
            >
              Cancel order
            </button>
          )}
        </div>

        <div className="mt-6">
          <Timeline order={order} />
        </div>
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}

      {cancelling && (
        <CancelPanel
          order={order}
          onClose={() => setCancelling(false)}
          onCancelled={(updated) => {
            setOrder(updated);
            setCancelling(false);
            setNotice(`Order ${updated.order_no} has been cancelled.`);
          }}
        />
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="font-bold text-gray-900">
          Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
        </h2>
        <ul className="mt-4 divide-y divide-gray-100">
          {order.items.map((item) => {
            const name = <span className="font-semibold text-gray-900">{item.product_name}</span>;
            return (
              <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image src={item.image ?? PLACEHOLDER_IMAGE} alt={item.product_name} fill sizes="80px" className="object-contain p-1" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  {item.product_slug ? (
                    <Link href={`/product/${item.product_slug}`} className="hover:text-brand-600 hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  {item.variant_label && <p className="text-gray-500">{item.variant_label}</p>}
                  <p className="mt-1 text-gray-500">
                    {item.quantity} × {formatPrice(item.final_price)}
                    {item.unit_price > item.final_price && (
                      <span className="ml-2 text-gray-400 line-through">{formatPrice(item.unit_price)}</span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatPrice(item.line_total)}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold text-gray-900">Shipping address</h2>
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
          <h2 className="mt-6 border-t border-gray-100 pt-5 font-bold text-gray-900">Billing address</h2>
          <BillingAddress order={order} />
          <GstDetails order={order} />
          {order.customer_note && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Your note</p>
              <p className="mt-0.5 whitespace-pre-line">{order.customer_note}</p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900">Payment</h2>
            <span className="text-xs font-semibold text-gray-500">
              Cash on Delivery · {PAYMENT_STATUS[order.payment_status] ?? order.payment_status}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Price</dt>
              <dd className="font-semibold text-gray-900">{formatPrice(order.mrp_total)}</dd>
            </div>
            {productDiscount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Discount</dt>
                <dd className="font-semibold text-red-500">- {formatPrice(productDiscount)}</dd>
              </div>
            )}
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
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-3">
              <dt className="font-semibold text-gray-900">Total</dt>
              <dd className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {!canCancelOrder(order) && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <p className="text-center text-sm text-gray-500">
          Need to change or cancel this order?{' '}
          <Link href="/contact" className="font-semibold text-brand-600 hover:text-brand-700">
            Contact support
          </Link>
        </p>
      )}
    </div>
  );
}
