const ApiError = require('../utils/ApiError');

// validate(schemaFn): schemaFn(req.body) returns an object of { field: message } errors.
const validate = (schemaFn) => (req, res, next) => {
  const errors = schemaFn(req.body || {});
  if (errors && Object.keys(errors).length) {
    return next(ApiError.badRequest('Validation failed', errors));
  }
  return next();
};

module.exports = validate;
