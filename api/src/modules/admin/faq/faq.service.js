// Business logic for FAQs (admin). Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const { cleanHtml } = require('../../../utils/html');
const faqRepository = require('./faq.repository');

const DUPLICATE = 'This question already exists';

async function getOrFail(id) {
  const faq = await faqRepository.findById(id);
  if (!faq) throw ApiError.notFound('FAQ not found');
  return faq;
}

async function assertQuestionFree(question, excludeId = null) {
  if (await faqRepository.questionExists(question, excludeId)) {
    throw ApiError.conflict(DUPLICATE, { question: DUPLICATE });
  }
}

// Two requests can pass the check at the same time; the DB unique index catches the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'faqs_question_unique') {
    return ApiError.conflict(DUPLICATE, { question: DUPLICATE });
  }
  return err;
}

// Sanitized editor HTML; an empty editor ("<p><br></p>") is rejected.
function cleanAnswer(answer) {
  const clean = cleanHtml(answer);
  if (!clean) throw ApiError.badRequest('Validation failed', { answer: 'Answer is required' });
  return clean;
}

function list(filters, pagination) {
  return faqRepository.findAll(filters, pagination);
}

async function create(data) {
  await assertQuestionFree(data.question);
  const id = await faqRepository.create({
    question: data.question,
    answer: cleanAnswer(data.answer),
    sort_order: data.sort_order ?? (await faqRepository.nextSortOrder()),
    is_active: data.is_active ?? true,
  }).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(id);
}

async function update(id, data) {
  await getOrFail(id);
  const changes = { ...data };
  if (data.question !== undefined) await assertQuestionFree(data.question, id);
  if (data.answer !== undefined) changes.answer = cleanAnswer(data.answer);
  await faqRepository.update(id, changes).catch((err) => {
    throw mapUniqueViolation(err);
  });
  return getOrFail(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await faqRepository.update(id, { is_active: isActive });
  return getOrFail(id);
}

// ids in the new display order (e.g. after drag & drop). FAQs not listed keep their sort_order.
async function reorder(ids) {
  const existing = new Set(await faqRepository.findExistingIds(ids));
  const unknown = ids.filter((id) => !existing.has(id));
  if (unknown.length) {
    throw ApiError.badRequest('Validation failed', { ids: `FAQ id(s) ${unknown.join(', ')} not found` });
  }
  await faqRepository.reorder(ids);
}

async function remove(id) {
  await getOrFail(id);
  await faqRepository.remove(id);
}

module.exports = { list, getById: getOrFail, create, update, setStatus, reorder, remove };
