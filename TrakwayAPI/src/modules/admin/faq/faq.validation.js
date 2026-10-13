// Request validators for FAQs, used with middlewares/validate.
const { toInt, toBool, toList } = require('../../../utils/formData');

const MAX_QUESTION = 500;
const MAX_ANSWER = 20000;
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

// Middleware: converts form-data / urlencoded strings to real types. JSON passes through.
function normalize(req, res, next) {
  const body = { ...(req.body || {}) };
  if (body.sort_order !== undefined) body.sort_order = toInt(body.sort_order);
  if (body.is_active !== undefined) body.is_active = toBool(body.is_active);
  if (body.ids !== undefined) {
    const ids = toList(body.ids);
    body.ids = Array.isArray(ids) ? ids.map((id) => toInt(String(id))) : ids;
  }
  req.body = body;
  next();
}

function fieldErrors(body, { partial }) {
  const errors = {};
  if (body.question !== undefined || !partial) {
    if (typeof body.question !== 'string' || !body.question.trim()) errors.question = 'Question is required';
    else if (body.question.trim().length > MAX_QUESTION) errors.question = `Question must be at most ${MAX_QUESTION} characters`;
  }
  if (body.answer !== undefined || !partial) {
    if (typeof body.answer !== 'string' || !body.answer.trim()) errors.answer = 'Answer is required';
    else if (body.answer.length > MAX_ANSWER) errors.answer = `Answer must be at most ${MAX_ANSWER} characters`;
  }
  if (body.sort_order !== undefined && !Number.isInteger(body.sort_order)) {
    errors.sort_order = 'sort_order must be an integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'is_active must be true or false';
  }
  return errors;
}

// POST /faqs — { question, answer, sort_order?, is_active? }
const create = (body) => fieldErrors(body, { partial: false });

// PUT /faqs/:id — any of { question, answer, sort_order, is_active }
function update(body) {
  const errors = fieldErrors(body, { partial: true });
  if (!['question', 'answer', 'sort_order', 'is_active'].some((key) => body[key] !== undefined)) {
    errors.body = 'Provide at least one of: question, answer, sort_order, is_active';
  }
  return errors;
}

// PUT /faqs/reorder — { ids: [3, 1, 2] }
function reorder(body) {
  const { ids } = body;
  if (!Array.isArray(ids) || !ids.length || !ids.every(isPositiveInt)) return { ids: 'ids must be a list of FAQ ids' };
  if (new Set(ids).size !== ids.length) return { ids: 'The same id is listed twice' };
  return {};
}

function status(body) {
  return typeof body.is_active === 'boolean' ? {} : { is_active: 'is_active must be true or false' };
}

module.exports = { normalize, create, update, reorder, status };
