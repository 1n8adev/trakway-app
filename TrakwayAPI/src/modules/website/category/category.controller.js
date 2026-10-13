// HTTP layer: read req, call category.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const categoryService = require('./category.service');

// Category tabs on the products page.
const list = asyncHandler(async (req, res) => {
  response.success(res, await categoryService.tree());
});

module.exports = { list };
