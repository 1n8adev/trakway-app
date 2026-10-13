// Content authored in the admin's rich-text editor arrives as HTML. These helpers
// turn it into plain text so it renders through the site's own components
// instead of being injected with dangerouslySetInnerHTML.

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

// Splits rich text into paragraphs: one per <p>/<li>, falling back to the whole text.
export function htmlToParagraphs(html: string | null | undefined): string[] {
  if (!html) return [];
  const paragraphs = [...html.matchAll(/<(p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)]
    .map(([, , inner]) => htmlToText(inner))
    .filter(Boolean);
  if (paragraphs.length > 0) return paragraphs;
  const text = htmlToText(html);
  return text ? [text] : [];
}
