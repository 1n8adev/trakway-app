// Business logic for technicians. Throws ApiError on rule violations.
const fs = require('fs');
const ApiError = require('../../../utils/ApiError');
const { removeUploadedFile, removePrivateFile, privateFilePath } = require('../../../utils/file');
const technicianRepository = require('./technician.repository');
const { PHOTO_FIELDS, PRIVATE_PHOTO_FIELDS } = require('./technician.validation');

const conflict = (field, message) => ApiError.conflict(message, { [field]: message });

// The private ID proof key is never sent to the client; it gets an authenticated URL instead.
function format({ id_proof_photo: idProof, ...technician }) {
  return {
    ...technician,
    has_id_proof: Boolean(idProof),
    id_proof_url: idProof ? `/api/admin/technicians/${technician.id}/id-proof` : null,
  };
}

function removePhoto(field, value) {
  if (PRIVATE_PHOTO_FIELDS.includes(field)) removePrivateFile(value);
  else removeUploadedFile(value);
}

async function findOrFail(id) {
  const technician = await technicianRepository.findById(id);
  if (!technician) throw ApiError.notFound('Technician not found');
  return technician;
}

async function assertUnique({ mobile, email }, excludeId = null) {
  if (mobile !== undefined && (await technicianRepository.mobileExists(mobile, excludeId))) {
    throw conflict('mobile', 'A technician with this mobile number already exists');
  }
  if (email && (await technicianRepository.emailExists(email, excludeId))) {
    throw conflict('email', 'A technician with this email already exists');
  }
}

// Two requests can pass assertUnique at the same time; the DB unique indexes catch the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'technicians_mobile_unique') {
    return conflict('mobile', 'A technician with this mobile number already exists');
  }
  if (err.code === '23505' && err.constraint === 'technicians_email_unique') {
    return conflict('email', 'A technician with this email already exists');
  }
  return err;
}

async function list(filters, pagination) {
  const { items, total } = await technicianRepository.findAll(filters, pagination);
  return { items: items.map(format), total };
}

async function getById(id) {
  return format(await findOrFail(id));
}

async function create(data) {
  await assertUnique(data);
  const id = await technicianRepository.create({
    ...data,
    email: data.email ?? null,
    is_active: data.is_active ?? true,
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getById(id);
}

// A newly uploaded photo replaces the old one; the old file is deleted after the update succeeds.
async function update(id, data) {
  const existing = await findOrFail(id);
  await assertUnique(data, id);
  await technicianRepository.update(id, data).catch((err) => {
    throw mapUniqueViolation(err);
  });
  for (const field of PHOTO_FIELDS) {
    if (data[field] !== undefined && existing[field] !== data[field]) removePhoto(field, existing[field]);
  }
  return getById(id);
}

async function setStatus(id, isActive) {
  await findOrFail(id);
  await technicianRepository.update(id, { is_active: isActive });
  return getById(id);
}

async function remove(id) {
  const technician = await findOrFail(id);
  if ((await technicianRepository.countBookings(id)) > 0) {
    throw ApiError.conflict('Technician has bookings; deactivate the technician instead of deleting');
  }
  await technicianRepository.remove(id);
  for (const field of PHOTO_FIELDS) removePhoto(field, technician[field]);
}

// Absolute path of the technician's private ID proof file (404 if missing).
async function idProofFile(id) {
  const technician = await findOrFail(id);
  const filePath = privateFilePath(technician.id_proof_photo);
  if (!filePath || !fs.existsSync(filePath)) throw ApiError.notFound('ID proof file not found');
  return filePath;
}

module.exports = { list, getById, create, update, setStatus, remove, idProofFile };
