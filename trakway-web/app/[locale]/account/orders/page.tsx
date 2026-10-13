import type { Metadata } from 'next';
import OrdersList from '@/components/account/OrdersList';

export const metadata: Metadata = {
  title: 'My Orders'
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <OrdersList page={Math.max(1, Number(page) || 1)} />;
}
