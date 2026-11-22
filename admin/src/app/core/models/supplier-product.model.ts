// /api/admin/supplier-products — products as each supplier sells them to Trakway.
export interface SupplierProduct {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_is_active: boolean;
  // The Trakway accessory this is (mapped from the accessory form), or null.
  accessory_id: number | null;
  accessory_name: string | null;
  // Or the Trakway product it is (mapped from the product's Suppliers tab).
  product_id: number | null;
  product_name: string | null;
  // The supplier's item name / code, as on their invoice.
  name: string;
  // Purchase rate before GST.
  price: number;
  hsn_code: string;
  gst_rate: number;
  is_active: boolean;
  // Purchases that include it, and the total quantity bought. It can't be deleted while purchase_count > 0.
  purchase_count: number;
  purchased_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierProductFilters {
  page?: number;
  limit?: number;
  supplier_id?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

// supplier_id is sent on create only; it can't change afterwards.
export interface SupplierProductPayload {
  supplier_id?: number;
  name?: string;
  price?: number | string;
  hsn_code?: string;
  gst_rate?: number;
  is_active?: boolean;
}

// Same rules as the API's supplier-product.validation.js.
export const SUPPLIER_PRODUCT_LIMITS = { maxName: 150 } as const;
export { GST_RATES } from './product-accessory.model';
