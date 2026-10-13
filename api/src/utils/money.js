// Rupee amounts.
const round2 = (n) => Math.round(n * 100) / 100;

// 2799 -> "₹2,799.00"
const formatInr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

module.exports = { round2, formatInr };
