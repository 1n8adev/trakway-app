import type { Metadata } from 'next';
import CartView from '@/components/cart/CartView';

export const metadata: Metadata = {
  title: 'Your Cart',
  robots: { index: false }
};

export default function CartPage() {
  return (
    <div className="pb-12">
      <div className="bg-gray-bread mb-12 py-6 text-start">
        <div className="mx-auto px-4 lg:max-w-7xl">
         <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">Your Cart</h1>
        </div>
      </div>

      <div className="mx-auto px-4 lg:max-w-7xl">
        <CartView />
      </div>
    </div>
  );
}
