export type DiscountType = 'percentage' | 'fixed';

// What the coupon is doing right now (worked out by the API).
export type CouponState = 'active' | 'scheduled' | 'expired' | 'used_up' | 'inactive';

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  // Cap for percentage coupons; null = no cap.
  max_discount: number | null;
  min_order_amount: number;
  // ISO timestamps; null = no start / no expiry.
  starts_at: string | null;
  expires_at: string | null;
  // null = unlimited.
  usage_limit: number | null;
  per_user_limit: number | null;
  is_active: boolean;
  // Orders that used it and are not cancelled.
  used_count: number;
  total_discount: number;
  state: CouponState;
  // e.g. "10% off (up to ₹500) on orders of ₹1,000 or more".
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface CouponFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

// null clears a cap / limit / date.
export interface CouponPayload {
  code?: string;
  description?: string | null;
  discount_type?: DiscountType;
  discount_value?: number;
  max_discount?: number | null;
  min_order_amount?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  is_active?: boolean;
}

// Rules from the API's coupon.validation.js.
export const COUPON_LIMITS = {
  codePattern: /^[A-Z0-9_-]{3,30}$/,
  maxCode: 30,
  maxDescription: 255,
  maxAmount: 9999999999.99,
} as const;

export const COUPON_STATE_LABEL: Record<CouponState, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  used_up: 'Used up',
  inactive: 'Inactive',
};

export const COUPON_STATE_BADGE: Record<CouponState, string> = {
  active: 'bg-green-50 text-green-700',
  scheduled: 'bg-sky-50 text-sky-700',
  expired: 'bg-gray-100 text-gray-500',
  used_up: 'bg-amber-50 text-amber-700',
  inactive: 'bg-red-50 text-red-600',
};
