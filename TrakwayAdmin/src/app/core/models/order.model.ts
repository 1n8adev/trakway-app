export type OrderStatus = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface OrderCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

// Snapshot of what was bought (product details are copied at checkout).
export interface OrderItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  product_slug: string | null;
  variant_label: string | null;
  sku: string | null;
  image: string | null;
  unit_price: number;
  final_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: number;
  // "ORD-000012"
  order_no: string;
  status: OrderStatus;
  payment_method: 'cod';
  payment_status: PaymentStatus;
  subtotal: number;
  mrp_total: number;
  coupon_id: number | null;
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
  // Billing snapshot, copied at checkout. When the same as delivery, bill_* repeat the ship_* values.
  billing_same_as_shipping: boolean;
  bill_name: string;
  bill_phone: string;
  bill_address_line1: string;
  bill_address_line2: string | null;
  bill_landmark: string | null;
  bill_city: string;
  bill_state: string;
  bill_pincode: string;
  // Optional, for a GST invoice.
  bill_company_name: string | null;
  bill_gstin: string | null;
  customer_note: string | null;
  admin_notes: string | null;
  cancel_reason: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items_count: number;
  customer: OrderCustomer;
  // Statuses it can move to now (empty once delivered / cancelled).
  next_statuses: OrderStatus[];
  // GET /:id only.
  items?: OrderItem[];
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  search?: string;
  // YYYY-MM-DD, order date in India time.
  from?: string;
  to?: string;
  user_id?: number;
}

export type OrderSummary = Record<'all' | OrderStatus, number>;

export interface OrderStatusPayload {
  status: OrderStatus;
  admin_notes?: string | null;
  cancel_reason?: string | null;
}

// Limits from the API's order.validation.js.
export const ORDER_LIMITS = {
  maxAdminNotes: 5000,
  maxCancelReason: 255,
} as const;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// Placed = waiting for the admin (orange).
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  placed: 'bg-brand-100 text-brand-600',
  confirmed: 'bg-sky-50 text-sky-700',
  shipped: 'bg-violet-50 text-violet-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

// Button text for moving to a status.
export const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirm Order',
  shipped: 'Mark as Shipped',
  delivered: 'Mark as Delivered',
  cancelled: 'Cancel Order',
};
