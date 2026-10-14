// Business logic for client logos. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { removeUploadedFile } = require('../../../utils/file');
const clientLogoRepository = require('./client-logo.repository');

async function getOrFail(id) {
  const logo = await clientLogoRepository.findById(id);
  if (!logo) throw ApiError.notFound('Client logo not found');
  return logo;
}

function list(filters, pagination) {
  return clientLogoRepository.findAll(filters, pagination);
}

async function create(data) {
  const id = await clientLogoRepository.create({
    name: data.name,
    image: data.image,
    sort_order: data.sort_order ?? 0,
    is_active: data.is_active ?? true,
  });
  return clientLogoRepository.findById(id);
}

// A new image replaces the old file on disk.
async function update(id, data) {
  const existing = await getOrFail(id);
  await clientLogoRepository.update(id, data);
  if (data.image !== undefined && data.image !== existing.image) {
    removeUploadedFile(existing.image);
  }
  return clientLogoRepository.findById(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await clientLogoRepository.update(id, { is_active: isActive });
  return clientLogoRepository.findById(id);
}

async function remove(id) {
  const logo = await getOrFail(id);
  await clientLogoRepository.remove(id);
  removeUploadedFile(logo.image);
}

module.exports = { list, getById: getOrFail, create, update, setStatus, remove };
