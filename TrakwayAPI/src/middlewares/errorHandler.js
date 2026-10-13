const env = require('../config/env');
const { removeUploadedFile, removePrivateFile } = require('../utils/file');

// PostgreSQL error codes mapped to HTTP responses.
const PG_ERRORS = {
  23505: [409, 'Duplicate value'],
  23503: [400, 'Related record not found'],
  '22P02': [400, 'Invalid input format'],
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // The request failed, so images uploaded with it would be orphaned.
  for (const file of [req.file, ...(req.files || [])]) {
    if (file?.publicPath) removeUploadedFile(file.publicPath);
    if (file?.privatePath) removePrivateFile(file.privatePath);
  }

  // err.status covers errors thrown by express itself (e.g. malformed JSON body -> 400).
  let statusCode = err.statusCode || err.status || 500;
  let { message } = err;

  if (PG_ERRORS[err.code]) {
    [statusCode, message] = PG_ERRORS[err.code];
  }

  if (statusCode >= 500) {
    console.error(err);
    if (env.nodeEnv === 'production') message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: message || 'Internal server error',
    ...(err.details && { errors: err.details }),
  });
};
