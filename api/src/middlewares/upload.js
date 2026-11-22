const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { UPLOAD_ROOT, PRIVATE_ROOT } = require('../utils/file');

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const MB = 1024 * 1024;
const DEFAULT_MAX_MB = 2;

// Shared multer instance that stores images in uploads/<folder>/ with random names.
// Fields listed in privateFields go to storage/private/<folder>/ instead (never served publicly).
// isAllowedField(fieldname) rejects files sent under unexpected field names.
function imageMulter(folder, { maxFiles, isAllowedField, maxMb = DEFAULT_MAX_MB, privateFields = [] }) {
  const publicDir = path.join(UPLOAD_ROOT, folder);
  const privateDir = path.join(PRIVATE_ROOT, folder);
  fs.mkdirSync(publicDir, { recursive: true });
  if (privateFields.length) fs.mkdirSync(privateDir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, privateFields.includes(file.fieldname) ? privateDir : publicDir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: maxMb * MB, files: maxFiles },
    fileFilter: (req, file, cb) => {
      if (!isAllowedField(file.fieldname)) {
        return cb(ApiError.badRequest(`Unexpected file field "${file.fieldname}"`, { [file.fieldname]: 'Unexpected file' }));
      }
      if (!IMAGE_TYPES[file.mimetype]) {
        return cb(ApiError.badRequest('Image must be JPG, PNG, WEBP or GIF', { [file.fieldname]: 'Invalid file type' }));
      }
      return cb(null, true);
    },
  });
}

// Wraps a multer handler: converts multer errors to ApiError and sets on each file either
// publicPath ("/uploads/<folder>/x.jpg") or, for private fields, privatePath ("<folder>/x.jpg").
function runUpload(handler, folder, { maxMb = DEFAULT_MAX_MB, privateFields = [] } = {}) {
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        let message = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') message = `Image must be ${maxMb} MB or smaller`;
        if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files';
        return next(ApiError.badRequest(message, { [err.field || 'files']: message }));
      }
      if (err) return next(err);
      for (const file of [req.file, ...(req.files || [])].filter(Boolean)) {
        if (privateFields.includes(file.fieldname)) file.privatePath = `${folder}/${file.filename}`;
        else file.publicPath = `/uploads/${folder}/${file.filename}`;
      }
      return next();
    });
  };
}

// Accepts multipart/form-data with one optional image in `field`, saved to uploads/<folder>/.
// Sets req.file.publicPath (e.g. /uploads/categories/abc.jpg). JSON requests pass through untouched.
function imageUpload(folder, field = 'image') {
  const handler = imageMulter(folder, { maxFiles: 1, isAllowedField: (name) => name === field }).single(field);
  return runUpload(handler, folder);
}

// Accepts several images under any field names isAllowedField approves (req.files, each with
// publicPath, or privatePath for privateFields). Options: maxFiles, isAllowedField, maxMb, privateFields.
function imagesUpload(folder, options) {
  const handler = imageMulter(folder, options).any();
  return runUpload(handler, folder, options);
}

const DOCUMENT_TYPES = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Accepts multipart/form-data with one optional document (PDF / JPG / PNG / WEBP) in `field`, stored
// privately in storage/private/<folder>/ (never served publicly). Sets req.file.privatePath ("<folder>/x.pdf")
// and keeps req.file.originalname. JSON requests pass through untouched.
function documentUpload(folder, field, { maxMb = 10 } = {}) {
  const dir = path.join(PRIVATE_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  const handler = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${DOCUMENT_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (req, file, cb) => {
      if (file.fieldname !== field) {
        return cb(ApiError.badRequest(`Unexpected file field "${file.fieldname}"`, { [file.fieldname]: 'Unexpected file' }));
      }
      if (!DOCUMENT_TYPES[file.mimetype]) {
        return cb(ApiError.badRequest('File must be a PDF, JPG, PNG or WEBP', { [field]: 'File must be a PDF, JPG, PNG or WEBP' }));
      }
      return cb(null, true);
    },
  }).single(field);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE' ? `File must be ${maxMb} MB or smaller` : err.message;
        return next(ApiError.badRequest(message, { [err.field || field]: message }));
      }
      if (err) return next(err);
      if (req.file) req.file.privatePath = `${folder}/${req.file.filename}`;
      return next();
    });
  };
}

// Parses multipart/form-data that has text fields only (no files allowed).
const formFields = () => multer().none();

module.exports = { imageUpload, imagesUpload, documentUpload, formFields };
