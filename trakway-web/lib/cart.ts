// Customer cart (per variant) against the Trakway backend. Browser-only: every
// call needs the logged-in customer's access token (see lib/auth.ts).

import { AUTH_CHANGE_EVENT, authRequest, getSession } from './auth';
import { toAssetUrl } from './products';

const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

export type CartItem = {
  id: number;
  productId: number;
  variantId: number | null;
  name: string;
  variantLabel: string | null;
  image: string | null;
  quantity: number;
  // Per-unit MRP and selling price.
  price: number;
  finalPrice: number;
  lineTotal: number;
  available: boolean;
  // Why an item can't be bought right now (out of stock, variant removed…).
  message: string | null;
};

export type CartSummary = {
  itemsCount: number;
  quantityTotal: number;
  mrpTotal: number;
  subtotal: number;
  savings: number;
  unavailableCount: number;
};

export type Cart = { items: CartItem[]; summary: CartSummary };

export type RawCart = {
  items: {
    id: number;
    product_id: number;
    variant_id: number | null;
    name: string;
    variant_label: string | null;
    image: string | null;
    quantity: number;
    price: number;
    final_price: number;
    line_total: number;
    available: boolean;
    message: string | null;
  }[];
  summary: {
    items_count: number;
    quantity_total: number;
    mrp_total: number;
    subtotal: number;
    savings: number;
    unavailable_count: number;
  };
};

export function toCart(raw: RawCart): Cart {
  return {
    items: (raw.items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      name: item.name,
      variantLabel: item.variant_label,
      image: toAssetUrl(item.image, PUBLIC_API_URL),
      quantity: item.quantity,
      price: item.price,
      finalPrice: item.final_price,
      lineTotal: item.line_total,
      available: item.available,
      message: item.message
    })),
    summary: {
      itemsCount: raw.summary?.items_count ?? 0,
      quantityTotal: raw.summary?.quantity_total ?? 0,
      mrpTotal: raw.summary?.mrp_total ?? 0,
      subtotal: raw.summary?.subtotal ?? 0,
      savings: raw.summary?.savings ?? 0,
      unavailableCount: raw.summary?.unavailable_count ?? 0
    }
  };
}

// --- Shared store (header badge, product page, cart page) -------------------

let cart: Cart | null = null;
const listeners = new Set<() => void>();
// Whose cart is loaded, so token refreshes don't trigger a reload.
let loadedForUser: string | null = null;

function setCart(next: Cart | null) {
  cart = next;
  listeners.forEach((listener) => listener());
}

function syncWithSession() {
  const userId = getSession()?.user?.id;
  const key = userId === undefined ? null : String(userId);
  if (key === loadedForUser) return;
  loadedForUser = key;
  if (key) refreshCart().catch(() => {});
  else setCart(null);
}

let watching = false;

// For useSyncExternalStore. Starts following login/logout on first use.
export function subscribeToCart(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    window.addEventListener(AUTH_CHANGE_EVENT, syncWithSession);
    window.addEventListener('storage', syncWithSession);
    syncWithSession();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCartSnapshot() {
  return cart;
}

// Mutations may answer with the updated cart; otherwise fetch it again.
async function applyResponse(raw: unknown) {
  if (raw && typeof raw === 'object' && 'items' in raw && 'summary' in raw) {
    const next = toCart(raw as RawCart);
    setCart(next);
    return next;
  }
  return refreshCart();
}

// --- API -----------------------------------------------------------------------

// GET /api/cart
export async function refreshCart(): Promise<Cart> {
  const next = toCart(await authRequest<RawCart>('GET', '/api/cart'));
  setCart(next);
  return next;
}

// POST /api/cart/items — variantId is null for products sold without variants.
export async function addToCart(input: { productId: number; variantId: number | null; quantity: number }) {
  const raw = await authRequest<unknown>('POST', '/api/cart/items', {
    product_id: input.productId,
    variant_id: input.variantId,
    quantity: input.quantity
  });
  return applyResponse(raw);
}

// PATCH /api/cart/items/:id
export async function updateCartItem(itemId: number, quantity: number) {
  return applyResponse(await authRequest<unknown>('PATCH', `/api/cart/items/${itemId}`, { quantity }));
}

// DELETE /api/cart/items/:id
export async function removeCartItem(itemId: number) {
  return applyResponse(await authRequest<unknown>('DELETE', `/api/cart/items/${itemId}`));
}

// DELETE /api/cart
export async function clearCart() {
  return applyResponse(await authRequest<unknown>('DELETE', '/api/cart'));
}
