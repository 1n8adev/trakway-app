// Every response body carries statusCode, matching the HTTP status.

function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, statusCode, message, data });
}

function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

function paginated(res, items, { page, limit, total }, message = 'Success') {
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

module.exports = { success, created, paginated };
