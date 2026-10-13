// HTTP layer: read req, call faq.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const faqService = require('./faq.service');

const list = asyncHandler(async (req, res) => {
  response.success(res, await faqService.list());
});

module.exports = { list };
