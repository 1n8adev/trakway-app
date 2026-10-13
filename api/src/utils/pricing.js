// Price + optional offer, shared by products and product variants.
//   offer_type 'price'      -> offer_value is the selling price (4000, offer 3500 -> 3500)
//   offer_type 'percentage' -> offer_value is % off price       (4000, 10%       -> 3600)
//   no offer_type           -> price

const OFFER_TYPES = ['price', 'percentage'];

const round2 = (n) => Math.round(n * 100) / 100;

// Computed prices for display and checkout. All null when there is no price.
function pricing({ price, offer_type: offerType, offer_value: offerValue }) {
  if (price === null || price === undefined) {
    return { offer_price: null, final_price: null, discount_amount: null, discount_percent: null };
  }
  let offerPrice = null;
  if (offerType === 'price') offerPrice = offerValue;
  if (offerType === 'percentage') offerPrice = round2(price * (1 - offerValue / 100));
  const finalPrice = offerPrice ?? price;
  const discount = round2(price - finalPrice);
  return {
    offer_price: offerPrice,
    final_price: finalPrice,
    discount_amount: discount,
    discount_percent: price > 0 ? round2((discount / price) * 100) : 0,
  };
}

// SQL expression for the final price of a row with price/offer_type/offer_value columns (alias prefix).
const finalPriceSql = (alias) => `CASE ${alias}.offer_type
  WHEN 'price' THEN ${alias}.offer_value
  WHEN 'percentage' THEN ROUND(${alias}.price * (1 - ${alias}.offer_value / 100), 2)
  ELSE ${alias}.price END`;

module.exports = { OFFER_TYPES, round2, pricing, finalPriceSql };
