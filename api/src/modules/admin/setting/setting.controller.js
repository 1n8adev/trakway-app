// HTTP layer: read req, call setting.service, send response via utils/response.
const asyncHandler = require('../../../utils/asyncHandler');
const response = require('../../../utils/response');
const settingService = require('./setting.service');

const getInvoice = asyncHandler(async (req, res) => {
  response.success(res, await settingService.getInvoiceSettings());
});

const updateInvoice = asyncHandler(async (req, res) => {
  const settings = await settingService.updateInvoiceSettings(req.body, req.user?.id);
  response.success(res, settings, settings.vendor_terms_is_default ? 'Default terms restored' : 'Invoice settings saved');
});

module.exports = { getInvoice, updateInvoice };
