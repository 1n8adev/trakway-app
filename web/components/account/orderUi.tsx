import type { OrderStatus, PaymentStatus } from '@/lib/checkout';

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: 'Placed', className: 'bg-blue-50 text-blue-700' },
  confirmed: { label: 'Confirmed', className: 'bg-brand-50 text-brand-700' },
  shipped: { label: 'Shipped', className: 'bg-purple-50 text-purple-700' },
  delivered: { label: 'Delivered', className: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700' }
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  pending: 'Pay on delivery',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = ORDER_STATUS[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>;
}

// "9 Oct 2026"
export function formatOrderDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "9 Oct 2026, 2:45 pm"
export function formatOrderDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
