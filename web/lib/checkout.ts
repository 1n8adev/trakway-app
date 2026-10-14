// Checkout (Cash on Delivery) and customer orders. Browser-only; needs a
// logged-in customer. Mirrors TrakwayAPI's modules/website/order.

import { authDownload, authRequest, authRequestPage, type Paginated } from './auth';
import { toCart, type Cart, type RawCart } from './cart';
import { toAssetUrl } from './products';

const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

export type AppliedCoupon = { code: string; discount: number; description: string };

export type CheckoutTotals = {
  mrpTotal: number;
  subtotal: number;
  couponDiscount: number;
  shippingFee: number;
  total: number;
};

export type CheckoutSummary = Cart & { coupon: AppliedCoupon | null; totals: CheckoutTotals };

type RawCheckoutSummary = RawCart & {
  coupon: AppliedCoupon | null;
  totals: { mrp_total: number; subtotal: number; coupon_discount: number; shipping_fee: number; total: number };
};

// POST /api/checkout/summary — totals for the checkout page, optionally with a
// coupon. An unusable coupon fails with a `coupon_code` field error.
export async function fetchCheckoutSummary(couponCode?: string | null): Promise<CheckoutSummary> {
  const raw = await authRequest<RawCheckoutSummary>('POST', '/api/checkout/summary', {
    coupon_code: couponCode || undefined
  });
  return {
    ...toCart(raw),
    coupon: raw.coupon,
    totals: {
      mrpTotal: raw.totals.mrp_total,
      subtotal: raw.totals.subtotal,
      couponDiscount: raw.totals.coupon_discount,
      shippingFee: raw.totals.shipping_fee,
      total: raw.totals.total
    }
  };
}

export type OrderItem = {
  id: number;
  product_id: number;
  variant_id: number | null;
  product_name: string;
  product_slug: string | null;
  variant_label: string | null;
  image: string | null;
  unit_price: number;
  final_price: number;
  quantity: number;
  line_total: number;
};

export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export type Order = {
  id: number;
  order_no: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  subtotal: number;
  mrp_total: number;
  coupon_code: string | null;
  coupon_discount: number;
  shipping_fee: number;
  total: number;
  ship_name: string;
  ship_phone: string;
  ship_address_line1: string;
  ship_address_line2: string | null;
  ship_landmark: string | null;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  billing_same_as_shipping: boolean;
  bill_name: string | null;
  bill_phone: string | null;
  bill_address_line1: string | null;
  bill_address_line2: string | null;
  bill_landmark: string | null;
  bill_city: string | null;
  bill_state: string | null;
  bill_pincode: string | null;
  bill_company_name: string | null;
  bill_gstin: string | null;
  customer_note: string | null;
  cancel_reason: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  items: OrderItem[];
};

// Row in the orders list (GET /api/orders).
export type OrderListItem = {
  id: number;
  order_no: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  total: number;
  created_at: string;
  items_count: number;
  first_item: { product_name: string; variant_label: string | null; image: string | null } | null;
};

// Customers can cancel online only until the order is confirmed.
export function canCancelOrder(order: { status: OrderStatus }) {
  return order.status === 'placed';
}

function toOrder(raw: Order): Order {
  return { ...raw, items: (raw.items ?? []).map((item) => ({ ...item, image: toAssetUrl(item.image, PUBLIC_API_URL) })) };
}

export type PlaceOrderInput = {
  addressId: number;
  billingSameAsShipping: boolean;
  // A saved address of the customer; ignored when billingSameAsShipping.
  billingAddressId: number | null;
  billingCompanyName: string | null;
  billingGstin: string | null;
  couponCode: string | null;
  note: string | null;
};

// 15-character GSTIN: 2-digit state code, PAN, entity number, "Z", checksum (as the backend checks).
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function validateGstDetails(companyName: string, gstin: string): { billing_company_name?: string; billing_gstin?: string } {
  const errors: { billing_company_name?: string; billing_gstin?: string } = {};
  if (companyName.length > 150) errors.billing_company_name = 'Company name must be at most 150 characters';
  if (gstin) {
    if (!GSTIN_REGEX.test(gstin)) errors.billing_gstin = 'Enter a valid 15-character GSTIN';
    else if (!companyName) errors.billing_company_name = 'Company name is required with a GSTIN';
  }
  return errors;
}

// POST /api/orders — places a Cash on Delivery order from the whole cart and
// empties the cart.
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const raw = await authRequest<Order>('POST', '/api/orders', {
    address_id: input.addressId,
    billing_same_as_shipping: input.billingSameAsShipping,
    billing_address_id: input.billingSameAsShipping ? undefined : input.billingAddressId,
    billing_company_name: input.billingCompanyName || undefined,
    billing_gstin: input.billingGstin || undefined,
    coupon_code: input.couponCode || undefined,
    note: input.note || undefined,
    payment_method: 'cod'
  });
  return toOrder(raw);
}

// GET /api/orders/:orderNo
export async function fetchOrder(orderNo: string): Promise<Order> {
  return toOrder(await authRequest<Order>('GET', `/api/orders/${encodeURIComponent(orderNo)}`));
}

// GET /api/orders?page=&limit= — newest first.
export async function listOrders(page = 1, limit = 10): Promise<Paginated<OrderListItem>> {
  const result = await authRequestPage<OrderListItem>(`/api/orders?page=${page}&limit=${limit}`);
  return {
    ...result,
    data: result.data.map((order) => ({
      ...order,
      first_item: order.first_item && { ...order.first_item, image: toAssetUrl(order.first_item.image, PUBLIC_API_URL) }
    }))
  };
}

// Cancelled orders have no invoice (the API refuses them too).
export function canDownloadInvoice(order: { status: OrderStatus }) {
  return order.status !== 'cancelled';
}

// GET /api/orders/:orderNo/invoice — saves the PDF tax invoice.
export function downloadInvoice(orderNo: string): Promise<void> {
  return authDownload(`/api/orders/${encodeURIComponent(orderNo)}/invoice`, `Invoice-${orderNo}.pdf`);
}

// POST /api/orders/:orderNo/cancel — only while the order is still "placed".
export async function cancelOrder(orderNo: string, reason?: string): Promise<Order> {
  const raw = await authRequest<Order>('POST', `/api/orders/${encodeURIComponent(orderNo)}/cancel`, {
    reason: reason?.trim() || undefined
  });
  return toOrder(raw);
}
