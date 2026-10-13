// HTTP layer: read req, call cart.service, send response via utils/response.
// Every cart endpoint returns the whole cart: { items, summary }.
const ApiError = require('../../../utils/ApiError');
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const cartService = require('./cart.service');

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid cart item id');
  return id;
}

const get = asyncHandler(async (req, res) => {
  response.success(res, await cartService.get(req.customer.id));
});

const add = asyncHandler(async (req, res) => {
  const { product_id: productId, variant_id: variantId, quantity } = req.body;
  const cart = await cartService.add(req.customer.id, { product_id: productId, variant_id: variantId ?? null, quantity });
  response.success(res, cart, 'Added to cart');
});

const update = asyncHandler(async (req, res) => {
  response.success(res, await cartService.setQuantity(req.customer.id, parseId(req.params.id), req.body.quantity), 'Cart updated');
});

const remove = asyncHandler(async (req, res) => {
  response.success(res, await cartService.remove(req.customer.id, parseId(req.params.id)), 'Removed from cart');
});

const clear = asyncHandler(async (req, res) => {
  response.success(res, await cartService.clear(req.customer.id), 'Cart cleared');
});

module.exports = { get, add, update, remove, clear };
