const sanitizeHtml = require('sanitize-html');

// Allowed markup for rich-text editor content: formatting, lists, links, tables.
// Strips <script>, event handlers (onclick=...), javascript: URLs, styles, iframes, etc.
const OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'blockquote', 'code', 'pre',
    'ul', 'ol', 'li', 'a',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

// Returns clean HTML, or null when nothing meaningful is left (e.g. "<p><br></p>").
function cleanHtml(html) {
  if (html === null || html === undefined) return null;
  const clean = sanitizeHtml(String(html), OPTIONS).trim();
  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').trim();
  return text || /<table/i.test(clean) ? clean : null;
}

module.exports = { cleanHtml };
