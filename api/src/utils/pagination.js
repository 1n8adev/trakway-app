const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Parses ?page=&limit= into safe integers plus a SQL offset.
function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { getPagination };
