// Customer saved addresses (/api/addresses). Browser-only; needs a logged-in
// customer. Fields keep the backend's snake_case names since the form posts
// them back unchanged.

import { authRequest } from './auth';

export const MAX_ADDRESSES = 10;

// Mirrors the backend's constants/indianStates.js — the API rejects anything else.
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal'
];

export type AddressInput = {
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
};

export type Address = AddressInput & {
  id: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// "+91 98765 43210", "098765-43210", "919876543210" -> "9876543210" (as the backend does).
function normalizePhone(value: string) {
  let digits = value.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

// Same rules as the backend's address.validation.js.
export function validateAddress(input: AddressInput): AddressErrors {
  const errors: AddressErrors = {};
  if (!input.name) errors.name = 'Name is required';
  else if (input.name.length > 100) errors.name = 'Must be at most 100 characters';

  const phone = normalizePhone(input.phone);
  if (!input.phone) errors.phone = 'Phone number is required';
  else if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number';

  if (!input.address_line1) errors.address_line1 = 'Address is required';
  else if (input.address_line1.length > 255) errors.address_line1 = 'Must be at most 255 characters';
  if (input.address_line2 && input.address_line2.length > 255) errors.address_line2 = 'Must be at most 255 characters';
  if (input.landmark && input.landmark.length > 255) errors.landmark = 'Must be at most 255 characters';

  if (!input.city) errors.city = 'City is required';
  else if (input.city.length > 100) errors.city = 'Must be at most 100 characters';
  if (!input.state) errors.state = 'State is required';
  else if (!INDIAN_STATES.includes(input.state)) errors.state = 'Select a valid state';
  if (!input.pincode) errors.pincode = 'Pincode is required';
  else if (!/^[1-9]\d{5}$/.test(input.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  return errors;
}

// One line for compact display: "12 MG Road, Near Bus Stand, Chennai, Tamil Nadu - 600001".
export function formatAddress(address: Address) {
  return [address.address_line1, address.address_line2, address.landmark, address.city, `${address.state} - ${address.pincode}`]
    .filter(Boolean)
    .join(', ');
}

// GET /api/addresses — default first, then newest.
export function listAddresses() {
  return authRequest<Address[]>('GET', '/api/addresses');
}

// POST /api/addresses — the first address becomes the default automatically.
export function createAddress(input: AddressInput) {
  return authRequest<Address>('POST', '/api/addresses', input);
}

// PUT /api/addresses/:id
export function updateAddress(id: number, input: Partial<AddressInput>) {
  return authRequest<Address>('PUT', `/api/addresses/${id}`, input);
}

// PATCH /api/addresses/:id/default
export function setDefaultAddress(id: number) {
  return authRequest<Address>('PATCH', `/api/addresses/${id}/default`);
}

// DELETE /api/addresses/:id — deleting the default promotes the newest remaining one.
export function deleteAddress(id: number) {
  return authRequest<null>('DELETE', `/api/addresses/${id}`);
}
