// "Rs. 4,000.00" — Indian digit grouping, always two decimals.
export function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
