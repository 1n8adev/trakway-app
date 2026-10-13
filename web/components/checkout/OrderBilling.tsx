import type { Order } from '@/lib/checkout';

// Billing address + GST details of a placed order (order details and confirmation pages).
// Always shows the full address. The backend copies the shipping address into the
// bill_* columns when they match; older orders (before billing) fall back to ship_*.
export function BillingAddress({ order }: { order: Order }) {
  const hasBilling = Boolean(order.bill_name);
  const a = {
    name: hasBilling ? order.bill_name : order.ship_name,
    phone: hasBilling ? order.bill_phone : order.ship_phone,
    line1: hasBilling ? order.bill_address_line1 : order.ship_address_line1,
    line2: hasBilling ? order.bill_address_line2 : order.ship_address_line2,
    landmark: hasBilling ? order.bill_landmark : order.ship_landmark,
    city: hasBilling ? order.bill_city : order.ship_city,
    state: hasBilling ? order.bill_state : order.ship_state,
    pincode: hasBilling ? order.bill_pincode : order.ship_pincode
  };
  const sameAsShipping = order.billing_same_as_shipping || !hasBilling;

  return (
    <div className="mt-3">
      <address className="text-sm leading-relaxed text-gray-600 not-italic">
        <span className="font-semibold text-gray-900">{a.name}</span>
        <br />
        {a.line1}
        {a.line2 && `, ${a.line2}`}
        {a.landmark && (
          <>
            <br />
            {a.landmark}
          </>
        )}
        <br />
        {a.city}, {a.state} - {a.pincode}
        <br />
        {a.phone}
      </address>
      {sameAsShipping && (
        <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          Same as shipping address
        </span>
      )}
    </div>
  );
}

export function GstDetails({ order }: { order: Order }) {
  if (!order.bill_company_name && !order.bill_gstin) return null;
  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
      {order.bill_company_name && <p className="font-semibold text-gray-800">{order.bill_company_name}</p>}
      {order.bill_gstin && <p className="mt-0.5">GSTIN: {order.bill_gstin}</p>}
    </div>
  );
}
