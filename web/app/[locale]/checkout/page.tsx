import type { Metadata } from 'next';
import CheckoutView from '@/components/checkout/CheckoutView';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false }
};

export default function CheckoutPage() {
  return (
    <div className="pb-12">
      <div className="bg-gray-bread mb-12 py-6 text-start">
        <div className="mx-auto px-4 lg:max-w-7xl">
         <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">Checkout</h1>
        </div>
      </div>

      <div className="mx-auto px-4 lg:max-w-7xl">
        <CheckoutView />
      </div>
    </div>
  );
}
