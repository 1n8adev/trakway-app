import { Order, OrderItem } from './order.model';

// Website customers, from /api/admin/users.
export interface WebsiteUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Devices currently logged in (GET /:id only).
  active_sessions?: number;
}

export interface UserOrderStats {
  orders_count: number;
  placed: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  // placed + confirmed + shipped
  active_orders: number;
  // Delivered orders only.
  total_spent: number;
  // Orders still in progress.
  pending_amount: number;
  coupon_savings: number;
  offer_savings: number;
  first_order_at: string | null;
  last_order_at: string | null;
}

export interface UserAddress {
  id: number;
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

// An order as listed under a customer (no customer / next_statuses; items included).
export type UserOrder = Omit<Order, 'customer' | 'next_statuses' | 'items_count' | 'coupon_id' | 'items'> & {
  items: OrderItem[];
};

// GET /users/:id (and PATCH /users/:id/status).
export interface WebsiteUserDetail extends WebsiteUser {
  active_sessions: number;
  order_stats: UserOrderStats;
  cart: { lines: number; quantity: number };
  addresses: UserAddress[];
  orders: UserOrder[];
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  verified?: 'true' | 'false';
}

// Counts from GET /users/summary.
export interface UserSummary {
  all: number;
  verified: number;
  unverified: number;
  active: number;
  inactive: number;
}
