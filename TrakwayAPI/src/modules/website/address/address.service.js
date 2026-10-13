// Business logic for customer addresses. Throws ApiError on rule violations.
// One address is always the default: the first one, or whichever the customer picks.
const ApiError = require('../../../utils/ApiError');
const { withTransaction } = require('../../../config/db');
const addressRepository = require('./address.repository');

const MAX_ADDRESSES = 10;

async function getOrFail(userId, id, client) {
  const address = await addressRepository.findOne(userId, id, client);
  if (!address) throw ApiError.notFound('Address not found');
  return address;
}

const list = (userId) => addressRepository.findByUser(userId);

async function create(userId, data) {
  const count = await addressRepository.countByUser(userId);
  if (count >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
  }
  const makeDefault = count === 0 || data.is_default === true;
  const id = await withTransaction(async (client) => {
    const newId = await addressRepository.create(userId, { ...data, is_default: false }, client);
    if (makeDefault) await addressRepository.setDefault(userId, newId, client);
    return newId;
  });
  return getOrFail(userId, id);
}

async function update(userId, id, data) {
  await getOrFail(userId, id);
  await withTransaction(async (client) => {
    await addressRepository.update(id, data, client);
    if (data.is_default === true) await addressRepository.setDefault(userId, id, client);
  });
  return getOrFail(userId, id);
}

async function setDefault(userId, id) {
  await getOrFail(userId, id);
  await withTransaction((client) => addressRepository.setDefault(userId, id, client));
  return getOrFail(userId, id);
}

// Deleting the default makes the newest remaining address the default.
async function remove(userId, id) {
  const address = await getOrFail(userId, id);
  await withTransaction(async (client) => {
    await addressRepository.remove(id, client);
    if (address.is_default) {
      const nextId = await addressRepository.findNewestId(userId, client);
      if (nextId) await addressRepository.setDefault(userId, nextId, client);
    }
  });
}

module.exports = { list, getOrFail, create, update, setDefault, remove };
