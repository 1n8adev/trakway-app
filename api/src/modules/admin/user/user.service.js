// Business logic for website customers (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const userRepository = require('./user.repository');

async function getOrFail(id) {
  const user = await userRepository.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

const list = (filters, pagination) => userRepository.findAll(filters, pagination);
const summary = () => userRepository.counts();

// Customer profile with order stats, saved addresses, cart size, and every order with its items.
async function getById(id) {
  const { cart_lines: cartLines, cart_quantity: cartQuantity, ...user } = await getOrFail(id);
  const [stats, addresses, orders] = await Promise.all([
    userRepository.findOrderStats(id),
    userRepository.findAddresses(id),
    userRepository.findOrdersWithItems(id),
  ]);
  return {
    ...user,
    order_stats: {
      ...stats,
      active_orders: stats.placed + stats.confirmed + stats.shipped,
    },
    cart: { lines: cartLines, quantity: cartQuantity },
    addresses,
    orders,
  };
}

// Deactivating blocks login and ends all the customer's sessions (refresh tokens).
async function setStatus(id, isActive) {
  await getOrFail(id);
  await userRepository.setActive(id, isActive);
  return getById(id);
}

module.exports = { list, summary, getById, setStatus };
