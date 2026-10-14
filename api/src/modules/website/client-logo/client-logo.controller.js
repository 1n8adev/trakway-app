// HTTP layer: read req, call client-logo.repository, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const clientLogoRepository = require('./client-logo.repository');

// "Our Clients" logo strip on the website.
const list = asyncHandler(async (req, res) => {
  response.success(res, await clientLogoRepository.findActive());
});

module.exports = { list };
