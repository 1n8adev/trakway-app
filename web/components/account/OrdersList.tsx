'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { AuthApiError, type Paginated } from '@/lib/auth';
import { listOrders, type OrderListItem } from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { OrderStatusBadge, formatOrderDate } from './orderUi';

const PAGE_SIZE = 10;
const PLACEHOLDER_IMAGE = '/images/products/v5/v5.png';

function OrderRow({ order }: { order: OrderListItem }) {
  const more = order.items_count - 1;

  return (
    <li>
      <Link
        href={`/account/orders/${order.order_no}`}
        className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-600 hover:shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-900">{order.order_no}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <span className="text-sm text-gray-500">Placed on {formatOrderDate(order.created_at)}</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={order.first_item?.image ?? PLACEHOLDER_IMAGE}
              alt={order.first_item?.product_name ?? order.order_no}
              fill
              sizes="64px"
              className="object-contain p-1"
            />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold text-gray-900">{order.first_item?.product_name ?? 'Order'}</p>
            {order.first_item?.variant_label && <p className="truncate text-gray-500">{order.first_item.variant_label}</p>}
            {more > 0 && (
              <p className="text-gray-500">
                + {more} more item{more === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
            <p className="mt-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700">View details →</p>
          </div>
        </div>
      </Link>
    </li>
  );
}

export default function OrdersList({ page }: { page: number }) {
  const [result, setResult] = useState<Paginated<OrderListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    listOrders(page, PAGE_SIZE)
      .then(setResult)
      .catch((err) => setError(err instanceof AuthApiError ? err.message : 'Could not load your orders.'));
  }, [page]);

  const header = (
    <div>
      <h2 className="text-2xl font-extrabold text-gray-900">My orders</h2>
      <p className="mt-1 text-sm text-gray-500">
        {result ? `${result.pagination.total} order${result.pagination.total === 1 ? '' : 's'}` : 'Track and manage your orders'}
      </p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const { data: orders, pagination } = result;

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-lg font-bold text-gray-900">{page > 1 ? 'No orders on this page' : 'No orders yet'}</p>
          <p className="mt-1 text-sm text-gray-500">When you place an order, it will show up here.</p>
          <Link
            href={page > 1 ? '/account/orders' : '/products'}
            className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {page > 1 ? 'Back to first page' : 'Start shopping'}
          </Link>
        </div>
      </div>
    );
  }

  const pageLink = (n: number) => (n === 1 ? '/account/orders' : `/account/orders?page=${n}`);
  const linkClass = 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand-600 hover:text-brand-600';

  return (
    <div className="space-y-6">
      {header}
      <ul className="space-y-4">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </ul>

      {pagination.totalPages > 1 && (
        <nav aria-label="Orders pages" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={pageLink(page - 1)} className={linkClass}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          {page < pagination.totalPages ? (
            <Link href={pageLink(page + 1)} className={linkClass}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
