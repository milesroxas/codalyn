/**
 * Shared emptiness predicate for rich-text HTML. Webflow conditional visibility and the runtime treat an "empty"
 * rich-text value the same as an empty string, but a Lexical editor serializes an empty document as `<p></p>` /
 * `<p><br></p>`, and pasted content can be whitespace or `&nbsp;`. Strip tags + entities + whitespace and check
 * for any remaining visible character. Pure string work (no DOM) so it runs in the model boundary, the Composer,
 * and a node-side test alike — the three call sites that must agree (see plan §8).
 *
 * Note: JS `\s` already matches ` ` (non-breaking space) and other Unicode spaces, so the literal nbsp char
 * collapses via the final `\s+`. Only the HTML *entity* forms (`&nbsp;`, `&#160;`, `&#xa0;`) need explicit handling.
 */
export function isRichTextHtmlEmpty(html: string | null | undefined): boolean {
  if (html == null) {
    return true;
  }
  const withoutTags = String(html).replace(/<[^>]*>/g, "");
  const normalized = withoutTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;|&#x0*a0;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length === 0;
}
