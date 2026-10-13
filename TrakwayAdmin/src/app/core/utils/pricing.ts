import { OfferType } from '../models/product.model';

// Mirrors the API's utils/pricing.js so the admin can preview the selling price while typing.
//   'price'      -> offer value is the selling price
//   'percentage' -> price minus offer value %
//   no offer     -> price

export const round2 = (n: number): number => Math.round(n * 100) / 100;

// Up to 2 decimals, checked on the typed text (float maths: 19.99 * 100 = 1998.999…).
export const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

// Text of a number input value ('' when empty).
export const rawNumber = (value: number | string | null | undefined): string =>
  value === null || value === undefined ? '' : String(value).trim();

export interface PricePreview {
  final: number;
  discountPercent: number;
}

// null while the price (or the offer value, when an offer type is chosen) is missing or not a number.
export function previewPrice(
  price: number | string | null | undefined,
  offerType: OfferType | '' | null | undefined,
  offerValue: number | string | null | undefined,
): PricePreview | null {
  const priceRaw = rawNumber(price);
  const p = Number(priceRaw);
  if (priceRaw === '' || !Number.isFinite(p)) return null;
  let final = p;
  if (offerType) {
    const valueRaw = rawNumber(offerValue);
    const v = Number(valueRaw);
    if (valueRaw === '' || !Number.isFinite(v)) return null;
    final = offerType === 'price' ? v : round2(p * (1 - v / 100));
  }
  const discount = round2(p - final);
  return { final, discountPercent: p > 0 ? round2((discount / p) * 100) : 0 };
}

// Same rules as the API's offerErrors(). Returns an error per field, or {} when valid.
export function pricingErrors(
  price: number | string | null | undefined,
  offerType: OfferType | '' | null | undefined,
  offerValue: number | string | null | undefined,
  { priceRequired }: { priceRequired: boolean },
): { price?: string; offer_value?: string } {
  const errors: { price?: string; offer_value?: string } = {};
  const priceRaw = rawNumber(price);
  const p = Number(priceRaw);
  const priceOk = priceRaw !== '' && Number.isFinite(p) && p >= 0 && p <= 9999999999.99 && TWO_DECIMALS.test(priceRaw);

  if (priceRaw === '') {
    if (priceRequired) errors.price = 'Enter a price (0 or more)';
    else if (offerType) errors.price = 'Set a price to add an offer';
  } else if (!Number.isFinite(p) || p < 0 || p > 9999999999.99) {
    errors.price = 'Enter a price (0 or more)';
  } else if (!TWO_DECIMALS.test(priceRaw)) {
    errors.price = 'At most 2 decimal places';
  }

  if (offerType) {
    const valueRaw = rawNumber(offerValue);
    const v = Number(valueRaw);
    if (valueRaw === '' || !Number.isFinite(v)) {
      errors.offer_value = offerType === 'price' ? 'Enter the selling price after the offer' : 'Enter the % off';
    } else if (!TWO_DECIMALS.test(valueRaw)) {
      errors.offer_value = 'At most 2 decimal places';
    } else if (offerType === 'price' && priceOk && v >= p) {
      errors.offer_value = 'Must be less than the price';
    } else if (offerType === 'percentage' && (v <= 0 || v >= 100)) {
      errors.offer_value = 'More than 0 and less than 100';
    }
  }
  return errors;
}

// ₹ amount in Indian grouping, e.g. 249999.5 -> "₹2,49,999.50".
export function rupees(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
