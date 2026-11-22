// /api/admin/stock — available stock per product / accessory, calculated from purchases, vendor invoices
// and website orders. Stock is per product: all of a product's combinations share it.
export type StockItemType = 'product' | 'accessory';
// negative = more sold than purchased (purchases not entered yet).
export type StockStatus = 'in_stock' | 'out_of_stock' | 'negative';

export interface StockItem {
  type: StockItemType;
  id: number;
  name: string;
  is_active: boolean;
  image: string | null;
  // Category (products) or "HSN 8536" (accessories).
  subtitle: string | null;
  purchased: number;
  invoiced: number;
  // Website orders (products only).
  ordered: number;
  sold: number;
  stock: number;
  status: StockStatus;
  // List only.
  supplier_product_count?: number;
  variant_count?: number;
}

export interface StockSummary {
  total: number;
  in_stock: number;
  out_of_stock: number;
  negative: number;
  // Units on hand (positive stock only).
  units: number;
}

export interface StockList {
  items: StockItem[];
  summary: StockSummary;
}

export interface StockFilters {
  type?: StockItemType;
  search?: string;
  status?: StockStatus;
  active?: boolean;
}

export type StockMovementKind = 'purchase' | 'invoice' | 'order';

export interface StockMovement {
  date: string;
  kind: StockMovementKind;
  ref_id: number;
  // PUR-000001 / TWV/2026-27/0001 / ORD-000012
  ref_no: string;
  // Supplier, vendor or delivery name.
  party: string;
  detail: string;
  // + in, − out.
  quantity: number;
  // Stock after this movement.
  balance: number;
  created_at: string;
}

export interface StockHistory {
  item: StockItem;
  // Newest first.
  movements: StockMovement[];
}
