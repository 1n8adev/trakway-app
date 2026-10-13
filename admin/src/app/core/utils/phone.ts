// Same rules as the API's utils/phone.js.
const MOBILE_REGEX = /^[6-9]\d{9}$/;

// "+91 98765 43210", "098765-43210", "919876543210" -> "9876543210"
export function normalizeMobile(value: string): string {
  let digits = value.replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export const isMobile = (value: string): boolean => MOBILE_REGEX.test(normalizeMobile(value));
