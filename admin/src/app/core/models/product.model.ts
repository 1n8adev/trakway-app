// Shapes returned by /api/admin/products. Every tab save returns the full ProductDetails.

export interface ProductImage {
  id: number;
  image: string;
  sort_order: number;
}

export interface ProductBenefit {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  sort_order: number;
}

// One section of the Specifications tab; description is editor HTML.
export interface ProductSpecification {
  title: string;
  description: string | null;
}

export interface VariantValue {
  attribute_id: number;
  attribute: string;
  value_id: number;
  value: string;
}

// Optional offer on a combination:
//   'price'      -> offer_value is the selling price (below price)
//   'percentage' -> offer_value is % off (more than 0, below 100)
export type OfferType = 'price' | 'percentage';

// A priced combination of attribute values, e.g. "Vodafone Sim + 1 Year Recharge" = 4000.
export interface ProductVariant {
  id: number;
  price: number;
  offer_type: OfferType | null;
  offer_value: number | null;
  // Computed by the API from price + offer.
  offer_price: number | null;
  final_price: number;
  discount_amount: number;
  discount_percent: number;
  sku: string | null;
  sort_order: number;
  is_active: boolean;
  values: VariantValue[];
  label: string;
}

// Attributes used by a product's combinations (what the website shows as option buttons).
export interface ProductAttributeSummary {
  attribute_id: number;
  attribute: string;
  values: { value_id: number; value: string }[];
}

export interface ProductVariantsResponse {
  attributes: ProductAttributeSummary[];
  variants: ProductVariant[];
}

// Row in GET /products.
export interface ProductListItem {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  slug: string;
  feature: string | null;
  short_description: string | null;
  sort_order: number;
  is_active: boolean;
  main_image: string | null;
  image_count: number;
  // Own price (products without combinations); null when priced per combination.
  price: number | null;
  offer_type: OfferType | null;
  offer_value: number | null;
  offer_price: number | null;
  final_price: number | null;
  discount_amount: number | null;
  discount_percent: number | null;
  has_variants: boolean;
  variant_count: number;
  // Lowest / highest selling price of the active combinations (null when none).
  min_variant_price: number | null;
  max_variant_price: number | null;
  created_at: string;
  updated_at: string;
}

// GET /products/:id and every save.
export interface ProductDetails {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  slug: string;
  feature: string | null;
  short_description: string | null;
  long_description: string | null;
  feature_list: string[];
  specifications: ProductSpecification[];
  package_details: string | null;
  box_contents: string | null;
  price: number | null;
  offer_type: OfferType | null;
  offer_value: number | null;
  offer_price: number | null;
  final_price: number | null;
  discount_amount: number | null;
  discount_percent: number | null;
  has_variants: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
  benefits: ProductBenefit[];
  attributes: ProductAttributeSummary[];
  variants: ProductVariant[];
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  status?: 'active' | 'inactive';
}

// Tab 1 fields (POST / and PUT /:id/basic). Image files are sent separately.
export interface ProductBasicPayload {
  category_id: number;
  name: string;
  slug?: string;
  feature: string | null;
  short_description: string | null;
  long_description: string | null;
  feature_list: string[];
  // Optional: leave null for products priced per combination. null clears it on update.
  price: number | null;
  offer_type: OfferType | null;
  offer_value: number | null;
  sort_order: number;
  is_active: boolean;
  // Update only: ids of existing gallery images to delete.
  remove_image_ids?: number[];
}

// Tab 2 item. `image` keeps an existing benefit image; a new file replaces it.
export interface BenefitPayload {
  title: string;
  description: string | null;
  image: string | null;
}

// Tab 6 item. Without `id` a new combination is created; existing ones not sent are deleted.
export interface VariantPayload {
  id?: number;
  values: number[];
  price: number;
  offer_type: OfferType | null;
  offer_value: number | null;
  sku: string | null;
  is_active: boolean;
}

// Limits from the API's product.validation.js.
export const PRODUCT_LIMITS = {
  minImages: 1,
  maxImages: 10,
  maxBenefits: 20,
  maxFeatureList: 30,
  maxSpecSections: 30,
  maxVariants: 200,
  maxImageBytes: 2 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;
