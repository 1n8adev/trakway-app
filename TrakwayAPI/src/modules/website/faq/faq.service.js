// Business logic for website FAQs.
const faqRepository = require('./faq.repository');

function list() {
  return faqRepository.findActive();
}

module.exports = { list };
