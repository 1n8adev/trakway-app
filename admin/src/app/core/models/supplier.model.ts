export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  mobile: string;
  email: string | null;
  gstin: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  // Internal.
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierFilters {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  status?: 'active' | 'inactive';
}

// "" / null clears an optional field on update.
export interface SupplierPayload {
  name?: string;
  contact_person?: string | null;
  mobile?: string;
  email?: string | null;
  gstin?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string | null;
  is_active?: boolean;
}

// Limits from the API's supplier.validation.js (same as vendors).
export const SUPPLIER_LIMITS = {
  maxName: 150,
  maxContact: 100,
  maxEmail: 255,
  maxAddress: 500,
  maxCity: 60,
  maxNotes: 1000,
} as const;

export { GSTIN_REGEX } from './vendor.model';
