import type { Metadata } from 'next';
import OrderDetails from '@/components/account/OrderDetails';

type Props = { params: Promise<{ orderNo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNo } = await params;
  return { title: `Order ${decodeURIComponent(orderNo)}` };
}

export default async function OrderDetailsPage({ params }: Props) {
  const { orderNo } = await params;
  return <OrderDetails orderNo={decodeURIComponent(orderNo)} />;
}
