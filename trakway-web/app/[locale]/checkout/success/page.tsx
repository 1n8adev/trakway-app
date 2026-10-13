import type { Metadata } from 'next';
import OrderConfirmation from '@/components/checkout/OrderConfirmation';

export const metadata: Metadata = {
  title: 'Order Placed',
  robots: { index: false }
};

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="bg-gray-50 px-4 py-10 sm:py-14">
      <OrderConfirmation orderNo={order ?? null} />
    </div>
  );
}
