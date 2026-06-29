/**
 * Link URL scheme allowlist shared by the editor's link plugin (`validateUrl`) and any consumer that needs to
 * gate a href before it reaches the DOM. Only navigational schemes are permitted; `javascript:`/`data:`/`vbscript:`
 * are rejected (the runtime apply path ultimately writes hrefs into the published page).
 */
const SAFE_URL_SCHEME_RE = /^(https?:|mailto:|tel:)/i;

/** True for an http(s)/mailto/tel absolute URL, a protocol-relative `//host`, or a same-document relative path. */
export function isSafeRichTextUrl(raw: string): boolean {
  const url = raw.trim();
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
