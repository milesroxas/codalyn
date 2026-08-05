/**
 * Link URL scheme allowlist shared by the editor's link plugin (`validateUrl`) and any consumer that needs to
 * gate a href before it reaches the DOM. Only navigational schemes are permitted; `javascript:`/`data:`/`vbscript:`
 * are rejected (the runtime apply path ultimately writes hrefs into the published page).
 */
const SAFE_URL_SCHEME_RE = /^(https?:|mailto:|tel:)/i;

/**
 * The URL parser removes every C0 control character (including TAB/LF/CR) from anywhere in a URL and trims
 * surrounding whitespace before parsing the scheme, so a value carrying an embedded control character between
 * `java` and `script:` navigates as `javascript:`. Scheme tests must therefore run against the same reduced
 * string the browser parses; otherwise the obfuscated value matches neither the allowlist nor the `scheme:`
 * rejection and is misclassified as a harmless relative path.
 *
 * Interior spaces are deliberately preserved: browsers percent-encode rather than remove them, so they cannot
 * be used to split a scheme, and dropping them would corrupt legitimate `mailto:` query strings.
 */
export function stripUrlControlCharacters(raw: string): string {
  let stripped = "";
  for (const char of raw) {
    const code = char.codePointAt(0);
    if (code !== undefined && code >= 0x20) {
      stripped += char;
    }
  }
  return stripped.trim();
}

/** True for an http(s)/mailto/tel absolute URL, a protocol-relative `//host`, or a same-document relative path. */
export function isSafeRichTextUrl(raw: string): boolean {
  const url = stripUrlControlCharacters(raw);
  if (url.length === 0) {
    return false;
  }
  if (SAFE_URL_SCHEME_RE.test(url)) {
    return true;
  }
  // No scheme at all → relative/anchor link (`/path`, `#id`, `path`, `//host`). A `scheme:`-prefixed value that did
  // not match the allowlist (e.g. `javascript:`) is rejected.
  return !/^[a-z][a-z0-9+.-]*:/i.test(url);
}
