// Validates admin-entered tracking snippets (Google tag, conversion pixels) that the website injects
// on a page. Only <script> elements are allowed, with a short list of attributes; external scripts
// must be https. Anything else (other HTML, event handlers, javascript: URLs) is rejected.

const MAX_LENGTH = 10000;
const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ATTRIBUTE = /([a-zA-Z][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const ALLOWED_ATTRIBUTES = new Set(['src', 'async', 'defer', 'type', 'id', 'crossorigin']);
const ALLOWED_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'application/ld+json', 'module']);

// Returns an error message, or null when the snippet is acceptable (empty is acceptable).
function scriptsError(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return 'Scripts must be text';
  if (value.length > MAX_LENGTH) return `Scripts must be at most ${MAX_LENGTH} characters`;

  let found = 0;
  for (const [, rawAttributes] of value.matchAll(SCRIPT_TAG)) {
    found += 1;
    for (const [, name, dq, sq, bare] of rawAttributes.matchAll(ATTRIBUTE)) {
      const attr = name.toLowerCase();
      const attrValue = (dq ?? sq ?? bare ?? '').trim();
      if (!ALLOWED_ATTRIBUTES.has(attr)) return `Attribute "${name}" is not allowed on <script>`;
      if (attr === 'src' && !/^https:\/\/[^\s]+$/i.test(attrValue)) return 'Script src must be an https:// URL';
      if (attr === 'type' && !ALLOWED_TYPES.has(attrValue.toLowerCase())) return `Script type "${attrValue}" is not allowed`;
    }
  }
  if (!found) return 'Paste one or more <script>…</script> tags';

  // Nothing but <script> tags, whitespace and HTML comments may remain.
  const rest = value.replace(SCRIPT_TAG, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (rest) return 'Only <script> tags are allowed here';
  return null;
}

module.exports = { scriptsError, MAX_SCRIPTS_LENGTH: MAX_LENGTH };
