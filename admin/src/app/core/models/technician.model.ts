export interface Technician {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  address: string;
  state: string;
  pincode: string;
  // Public paths under /uploads.
  technician_photo: string | null;
  shop_photo: string | null;
  // The ID proof is private: fetch id_proof_url with the admin token (TechnicianService.idProof).
  has_id_proof: boolean;
  id_proof_url: string | null;
  is_active: boolean;
  // Bookings currently assigned to them (list only, not GET /:id).
  open_jobs?: number;
  created_at: string;
  updated_at: string;
}

export interface TechnicianFilters {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  status?: 'active' | 'inactive';
}

// Text fields; "" / null email clears it on update.
export interface TechnicianPayload {
  name?: string;
  mobile?: string;
  email?: string | null;
  address?: string;
  state?: string;
  pincode?: string;
  is_active?: boolean;
}

export type TechnicianPhotoField = 'technician_photo' | 'shop_photo' | 'id_proof_photo';

export type TechnicianPhotos = Partial<Record<TechnicianPhotoField, File | null>>;

// Limits from the API's technician.validation.js.
export const TECHNICIAN_LIMITS = {
  maxName: 100,
  maxEmail: 255,
  maxAddress: 500,
  maxPhotoMb: 5,
} as const;
