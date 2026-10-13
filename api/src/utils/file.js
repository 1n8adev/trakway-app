const fs = require('fs');
const path = require('path');

// DATA_DIR (e.g. a mounted volume in production) holds uploads/ and private/; defaults to the project folder.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;
const UPLOAD_ROOT = DATA_DIR ? path.join(DATA_DIR, 'uploads') : path.join(__dirname, '..', '..', 'uploads');
// Not served by express.static — for sensitive files (e.g. ID proofs). Read via authenticated routes only.
const PRIVATE_ROOT = DATA_DIR ? path.join(DATA_DIR, 'private') : path.join(__dirname, '..', '..', 'storage', 'private');

// Deletes a file stored under uploads/, given its public path (/uploads/...). Ignores external URLs.
function removeUploadedFile(publicPath) {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOAD_ROOT, publicPath.slice('/uploads/'.length));
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  fs.promises.unlink(filePath).catch(() => {});
}

// Absolute path of a private file from its key (e.g. "technicians/abc.jpg"), or null if the key
// would escape PRIVATE_ROOT.
function privateFilePath(key) {
  if (typeof key !== 'string' || !key) return null;
  const filePath = path.join(PRIVATE_ROOT, key);
  return filePath.startsWith(PRIVATE_ROOT + path.sep) ? filePath : null;
}

function removePrivateFile(key) {
  const filePath = privateFilePath(key);
  if (filePath) fs.promises.unlink(filePath).catch(() => {});
}

module.exports = { UPLOAD_ROOT, PRIVATE_ROOT, removeUploadedFile, privateFilePath, removePrivateFile };
