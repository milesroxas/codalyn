import {
  CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME,
  isPublishPlaceholderImageReference,
} from "@/features/cms-slots/model/cms-slot-publish-placeholder-image-asset";

/**
 * Content tag on a prop-bound element; footer runtime swaps this element's content with the Composer value.
 * Value is a `|`-separated list of exposed prop ids; duplicate binding sites use an ordinal suffix `propId@N`
 * (see {@link formatContentAttrSegmentsForBindings}). The footer `pickP` resolves any segment back to its base propId.
 */
export const CMS_SLOT_CONTENT_ATTR = "data-cb-c";

/**
 * Conditional-visibility marker. `"1"` when the element's visibility is bound to a prop/CMS condition. The runtime
 * hides such an element when the Composer leaves its content empty (instead of falling back to the seeded default).
 */
export const CMS_SLOT_COND_ATTR = "data-cb-v";

/**
 * Rich-text marker. `"1"` when a bound element carries a `richText` content prop, so the runtime renders its value as
 * sanitized DOM nodes (formatting kept) instead of `textContent`. The published Webflow rich-text wrapper (`.w-richtext`)
 * is a structural fallback in the runtime, so this marker is the preferred, stable signal (CLAUDE.md: match by stable
 * markers, not presentation text).
 */
export const CMS_SLOT_HTML_ATTR = "data-cb-html";

/** Tag attributes the Designer writes onto bound elements (and that cleanup removes). */
const CMS_SLOT_WRITTEN_TAG_ATTRS = [CMS_SLOT_CONTENT_ATTR, CMS_SLOT_COND_ATTR, CMS_SLOT_HTML_ATTR] as const;

/** Canonical exposed prop id from a `data-cb-c` segment (strips the `@N` / `@…` suffix). */
export function canonicalPropIdFromContentAttrSegment(segment: string): string {
  const t = segment.trim();
  const at = t.indexOf("@");
  return at >= 0 ? t.slice(0, at) : t;
}

/**
 * Builds content attr segments: the first binding site for a prop keeps `propId`; later sites use an ordinal
 * `propId@N` (N = 1, 2, …) so the published DOM never repeats the same tag signature on two elements. The ordinal is
 * delimiter-free (no `|`/`@` collision); the footer `pickP` strips it to resolve the base propId.
 */
export function formatContentAttrSegmentsForBindings(
  canonicalPropIds: readonly string[],
  bindingCounts: Map<string, number>
): string[] {
  const segments: string[] = [];
  for (const canonical of canonicalPropIds) {
    const prior = bindingCounts.get(canonical) ?? 0;
    bindingCounts.set(canonical, prior + 1);
    segments.push(prior === 0 ? canonical : `${canonical}@${prior}`);
  }
  return segments;
}

/** Minimal attr API for removing Designer tags from a bound element. */
export type BeaconCmsSlotAttrRemoveOps = {
  get: (name: string) => Promise<null | string>;
  remove: (name: string) => Promise<null>;
};

/** Attr API for ownership-aware tag edits (rewrites `data-cb-c` instead of always clearing it). */
export type BeaconCmsSlotAttrOps = BeaconCmsSlotAttrRemoveOps & {
  set: (name: string, value: string) => Promise<null>;
};

/** Removes all CMS slot tag attrs when present; returns how many attrs were removed. */
export async function removeCmsSlotTagAttrsIfPresent(attr: BeaconCmsSlotAttrRemoveOps): Promise<number> {
  let removed = 0;
  for (const key of CMS_SLOT_WRITTEN_TAG_ATTRS) {
    const cur = await attr.get(key);
    if (cur != null && cur.length > 0) {
      await attr.remove(key);
      removed += 1;
    }
  }
  return removed;
}

/** Split a `data-cb-c` value into trimmed, non-empty segments. */
function parseContentAttrSegments(value: string | null | undefined): string[] {
  if (value == null) {
    return [];
  }
  const out: string[] = [];
  for (const part of value.split("|")) {
    const seg = part.trim();
    if (seg.length > 0) {
      out.push(seg);
    }
  }
  return out;
}

/** True when a `data-cb-c` segment's canonical prop id belongs to `ownerIds` (case-insensitive). */
export function contentAttrSegmentOwnedBy(segment: string, ownerIds: ReadonlySet<string>): boolean {
  const canonical = canonicalPropIdFromContentAttrSegment(segment);
  if (canonical.length === 0) {
    return false;
  }
  if (ownerIds.has(canonical)) {
    return true;
  }
  const lower = canonical.toLowerCase();
  for (const id of ownerIds) {
    if (id.toLowerCase() === lower) {
      return true;
    }
  }
  return false;
}

/**
 * Recomputes a (possibly shared) element's `data-cb-c` segments during **one** Designer component's tag sync.
 * Keeps segments owned by **other** Designer components (`foreignExposedIds`); drops the current component's old
 * segments and any segment owned by no current component (stale); then appends this sync's `newSegments`.
 * The same nested component definition can therefore carry one segment per Designer component that exposes it
 * (e.g. an Image nested in both Hero and Card), and the footer runtime resolves the right value per row via `pickP`.
 */
export function mergeContentAttrSegments(input: {
  existing: string | null;
  foreignExposedIds: ReadonlySet<string>;
  newSegments: readonly string[];
}): string[] {
  const kept = parseContentAttrSegments(input.existing).filter((seg) =>
    contentAttrSegmentOwnedBy(seg, input.foreignExposedIds)
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const seg of [...kept, ...input.newSegments]) {
    if (seg.length === 0 || seen.has(seg)) {
      continue;
    }
    seen.add(seg);
    out.push(seg);
  }
  return out;
}

/**
 * Removes segments owned by `ownerExposedIds` (one deleted Designer component) from a `data-cb-c` value, returning the
 * segments that remain (owned by other Designer components). Used to clean a deleted component's tags off shared
 * element definitions without disturbing the rest.
 */
export function removeOwnedContentAttrSegments(
  existing: string | null,
  ownerExposedIds: ReadonlySet<string>
): string[] {
  return parseContentAttrSegments(existing).filter((seg) => !contentAttrSegmentOwnedBy(seg, ownerExposedIds));
}

/**
 * Strips one Designer component's tags from a (possibly shared) element. Rewrites `data-cb-c` to the segments owned by
 * other components; when none remain also removes `data-cb-v`. `ownerExposedIds` empty
 * ⇒ removes all tags (single-owner / legacy). Returns the number of attributes changed.
 */
export async function removeOwnedCmsSlotTagAttrs(
  attr: BeaconCmsSlotAttrOps,
  ownerExposedIds: ReadonlySet<string>
): Promise<number> {
  if (ownerExposedIds.size === 0) {
    return removeCmsSlotTagAttrsIfPresent(attr);
  }
  const existing = await attr.get(CMS_SLOT_CONTENT_ATTR);
  const had = parseContentAttrSegments(existing);
  if (had.length === 0) {
    return removeCmsSlotTagAttrsIfPresent(attr);
  }
  const remaining = removeOwnedContentAttrSegments(existing, ownerExposedIds);
  if (remaining.length === had.length) {
    return 0;
  }
  if (remaining.length === 0) {
    return removeCmsSlotTagAttrsIfPresent(attr);
  }
  await attr.set(CMS_SLOT_CONTENT_ATTR, remaining.join("|"));
  return 1;
}

/** Webflow conditional visibility class on published elements when “Keep in HTML when hidden” is enabled. */
export const WEBFLOW_CONDITION_INVISIBLE_CLASS = "w-condition-invisible";

/**
 * Visible in Designer / publish HTML so Webflow conditional visibility includes tagged nodes; runtime treats as empty.
 * Non-network by construction (fragment / bare token — no scheme, no host), per Marketplace
 * round-4 feedback that URL-like placeholder domains get flagged in bundle review.
 */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_URL = "#codalyn-beacon-publish-placeholder";

export const CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL = "codalyn-beacon-publish-placeholder";

/** Non-breaking space used as a minimal text publish placeholder. */
export const CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT = "\u00a0";

/**
 * JS string literal for a value interpolated into the published runtime, with every non-ASCII code unit written as
 * a `\uXXXX` escape. `JSON.stringify` leaves characters such as U+00A0 as raw bytes, and the runtime is served by
 * Webflow's CDN as `application/javascript` with no charset — any consumer that decodes the body before hashing it
 * (App Review Preflight's browser capture, a proxy, an editor) can then disagree with the raw bytes. An ASCII-only
 * file hashes identically under every decoding, so the runtime must stay pure ASCII (pinned by
 * cms-slot-page-inline-script.test.ts). Pure; exported for tests.
 */
export function runtimeStringLiteral(value: string): string {
  return JSON.stringify(value).replace(
    /[\u0080-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

/** True when a value is a Designer/publish seed sentinel — not real Composer content. */
export function isBeaconPublishPlaceholderValue(v: unknown): boolean {
  if (v == null) {
    return false;
  }
  const raw = String(v);
  if (raw === CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT) {
    return true;
  }
  const s = raw.trim();
  if (s === CMS_SLOT_PUBLISH_PLACEHOLDER_URL || s === CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL) {
    return true;
  }
  return isPublishPlaceholderImageReference(v);
}

/** True when a Composer field is unset (Designer empty checks). */
export function isBeaconPropValueEmpty(v: unknown): boolean {
  if (v == null) {
    return true;
  }
  return String(v).trim() === "";
}

/** True when a runtime JSON `p` value should hide the bound node (includes publish placeholders). */
export function isBeaconRuntimePropValueEmpty(v: unknown): boolean {
  if (isBeaconPropValueEmpty(v)) {
    return true;
  }
  return isBeaconPublishPlaceholderValue(v);
}

/** Readable `function pickP(ps, k) {…}` for the footer runtime — resolves prop payload keys; `@`-suffixed segments fall back to the base prop id. */
export function beaconPropPickRuntimeSource(): string {
  return `function pickP(ps, k) {
  if (!k || !ps || typeof ps !== "object") return;
  var a = String(k);
  if (Object.prototype.hasOwnProperty.call(ps, a)) return ps[a];
  var al = a.toLowerCase();
  for (var x in ps) if (Object.prototype.hasOwnProperty.call(ps, x) && x.toLowerCase() === al) return ps[x];
  var at = a.indexOf("@");
  if (at > 0) {
    var b = a.slice(0, at);
    if (Object.prototype.hasOwnProperty.call(ps, b)) return ps[b];
    var bl = b.toLowerCase();
    for (var y in ps) if (Object.prototype.hasOwnProperty.call(ps, y) && y.toLowerCase() === bl) return ps[y];
  }
}
`;
}

/** Readable `function bPropEmpty(v) {…}` embedded in the footer runtime. */
export function beaconPropEmptyRuntimeSource(): string {
  const url = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  const email = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_EMAIL);
  const text = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT);
  const assetName = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  return `function bPropEmpty(v) {
  if (v == null) return true;
  var raw = String(v);
  if (raw === ${text}) return true;
  var s = raw.trim();
  if (s === "") return true;
  if (s.indexOf(${assetName}) >= 0) return true;
  return s === ${url} || s === ${email};
}
`;
}

/** Readable `applyValue` helpers for the footer runtime — sets `src`/`srcset` on images and picture/source descendants. */
export function beaconPropApplyValueRuntimeSource(): string {
  return [
    `function bLooksLikeImageUrl(v) {
  v = String(v == null ? "" : v);
  return /^https:\\/\\//i.test(v) || v.indexOf("//") === 0;
}
`,
    `function bEscapeCssUrl(u) {
  return String(u).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
}
`,
    // Media-src gate: https absolute, protocol-relative `//host` (inherits the published page's https), or a
    // scheme-less relative path. Any other explicit scheme (http:, data:, blob:, javascript:, …) → null and the
    // value is not applied at all (no partial application). http: is rejected as a downgrade/interception risk
    // (Marketplace round-6); the same control-character reduction as bSafeHref runs first.
    `function bSafeSrc(v) {
  v = bStripCtl(String(v == null ? "" : v));
  if (!v) return null;
  if (/^https:\\/\\//i.test(v)) return v;
  if (v.indexOf("//") === 0) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null;
  return v;
}
`,
    `function bApplyImageSrc(el, v) {
  v = bSafeSrc(v);
  if (v == null) return;
  var tag = String(el.tagName || "").toUpperCase();
  if (tag === "SOURCE") {
    el.setAttribute("srcset", v);
    if (/\\.avif(\\?|$)/i.test(v)) el.setAttribute("type", "image/avif");
    else if (/\\.webp(\\?|$)/i.test(v)) el.setAttribute("type", "image/webp");
    el.removeAttribute("src");
    return;
  }
  el.setAttribute("src", v);
  if (el.removeAttribute) {
    el.removeAttribute("srcset");
    el.removeAttribute("sizes");
  }
  var par = el.parentElement;
  if (par && String(par.tagName || "").toUpperCase() === "PICTURE") {
    var sources = par.querySelectorAll("source"),
      i;
    for (i = 0; i < sources.length; i++) bApplyImageSrc(sources[i], v);
  }
}
`,
    // v is reassigned to the sanitized (control-stripped, scheme-checked) value up front so every
    // downstream write — including the CSS background-image branch — emits exactly the string that
    // was validated, mirroring bSafeHref's write-what-you-validated contract (R5.1).
    `function bApplyImageToContainer(el, v) {
  v = bSafeSrc(v);
  if (v == null) return false;
  var pic =
    el.tagName && String(el.tagName).toUpperCase() === "PICTURE" ? el : el.querySelector && el.querySelector("picture");
  if (pic) {
    var sources = pic.querySelectorAll("source"),
      i;
    for (i = 0; i < sources.length; i++) bApplyImageSrc(sources[i], v);
    var pimg = pic.querySelector("img");
    if (pimg) bApplyImageSrc(pimg, v);
    return true;
  }
  var img = el.querySelector && el.querySelector("img");
  if (img) {
    bApplyImageSrc(img, v);
    return true;
  }
  var src = el.querySelector && el.querySelector("source");
  if (src) {
    bApplyImageSrc(src, v);
    return true;
  }
  var tag = String(el.tagName || "").toUpperCase();
  if (tag === "DIV" || tag === "SPAN" || tag === "FIGURE") {
    el.style.setProperty("background-image", 'url("' + bEscapeCssUrl(v) + '")');
    el.style.setProperty("background-size", "cover");
    return true;
  }
  return false;
}
`,
    `function bApplyLink(el, v) {
  var h = v,
    nt = false;
  if (v && v.charAt(0) === "{") {
    try {
      var o = JSON.parse(v);
      if (o && typeof o === "object" && typeof o.h === "string") {
        h = o.h;
        nt = o.t === 1 || o.t === true;
      }
    } catch (e) {}
  }
  h = bSafeHref(h);
  if (h == null) h = "#";
  el.setAttribute("href", h);
  if (nt) {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  } else {
    el.removeAttribute("target");
  }
}
`,
    // Browsers drop C0 control characters (TAB/LF/CR included) anywhere in a URL before parsing its scheme,
    // so the scheme test must run on the same reduced string the browser parses — otherwise a value with a
    // control character embedded mid-scheme evades both branches below and is treated as a relative path.
    // Mirrors stripUrlControlCharacters in shared/ui/rich-text-editor/lib/rich-text-url.ts.
    `function bStripCtl(h) {
  var o = "",
    i,
    c;
  for (i = 0; i < h.length; i++) {
    c = h.charCodeAt(i);
    if (c >= 32) o += h.charAt(i);
  }
  return o.replace(/^\\s+|\\s+$/g, "");
}
`,
    // Scheme allowlist shared by rich-text anchors and bApplyLink (mirrors isSafeRichTextUrl):
    // https/mailto/tel or scheme-less relative; any other scheme → null. http: is rejected —
    // web links must not downgrade transport (Marketplace round-6). sms: is not allowed.
    `function bSafeHref(h) {
  h = bStripCtl(String(h == null ? "" : h));
  if (!h) return null;
  if (/^(https:|mailto:|tel:)/i.test(h)) return h;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return null;
  return h;
}
`,
    // Belt-and-suspenders allowlist DOM sanitizer for rich text (the boundary sanitizer in
    // cms-slot-rich-text-html.ts is authoritative; this guard ensures the footer never blindly trusts the
    // payload string). Rebuilds the fragment from a DOMParser parse — same tag set as the boundary; anchors
    // keep only a safe href plus target="_blank"/rel; every other attribute is dropped. Returns the rebuilt
    // container element (its children are moved into the bound element node-by-node — the payload string is
    // never assigned as markup, so the runtime has no `innerHTML` write; App Review Preflight "Unsafe HTML
    // Injection", 2026-09-14), or null when DOM parsing is unavailable so applyValue falls back to textContent.
    `function bSafeHtml(v) {
  v = String(v == null ? "" : v);
  if (typeof DOMParser === "undefined") return null;
  var A = { p: 1, br: 1, strong: 1, b: 1, em: 1, i: 1, u: 1, a: 1, ul: 1, ol: 1, li: 1, h2: 1, h3: 1, blockquote: 1 },
    D = {
      script: 1,
      style: 1,
      template: 1,
      noscript: 1,
      iframe: 1,
      object: 1,
      embed: 1,
      form: 1,
      link: 1,
      meta: 1,
      base: 1,
    },
    doc;
  try {
    doc = new DOMParser().parseFromString(v, "text/html");
  } catch (e) {
    return null;
  }
  if (!doc || !doc.body) return null;
  var out = doc.createElement("div");
  function walk(src, dst) {
    var c, el, tag, h;
    for (c = src.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) {
        dst.appendChild(doc.createTextNode(c.nodeValue || ""));
        continue;
      }
      if (c.nodeType !== 1) continue;
      tag = c.tagName.toLowerCase();
      if (D[tag] === 1) continue;
      if (A[tag] !== 1) {
        walk(c, dst);
        continue;
      }
      el = doc.createElement(tag);
      if (tag === "a") {
        h = bSafeHref(c.getAttribute("href"));
        if (h == null) {
          walk(c, dst);
          continue;
        }
        el.setAttribute("href", h);
        if (c.getAttribute("target") === "_blank") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      }
      walk(c, el);
      dst.appendChild(el);
    }
  }
  walk(doc.body, out);
  return out;
}
`,
    // Moves the sanitized nodes into the bound element. appendChild adopts each node into the page
    // document; nothing is re-parsed from a string.
    `function bRenderNodes(el, src) {
  el.textContent = "";
  while (src.firstChild) el.appendChild(src.firstChild);
}
`,
    `function bIsRichTextEl(el) {
  return !!(
    el.getAttribute &&
    (el.getAttribute("data-cb-html") === "1" || (el.classList && el.classList.contains("w-richtext")))
  );
}
`,
    // Marketplace guidelines (credential/authentication fields; injected scripts must not modify
    // payment or checkout form elements): the runtime must never modify or act on password/login/
    // auth fields or payment fields. Slot bindings only reach app-tagged nodes, but this deny-list
    // guarantees a mis-tagged credential or payment field is skipped rather than written. `cc-`
    // covers every WHATWG autocomplete payment token (cc-number, cc-exp, cc-csc, cc-name, …),
    // including space-separated forms like "billing cc-number".
    `function bIsCredentialField(el) {
  var t = String(el.type || "").toLowerCase();
  if (t === "password" || t === "hidden") return true;
  var ac = String((el.getAttribute && el.getAttribute("autocomplete")) || "").toLowerCase();
  return (
    ac.indexOf("password") >= 0 ||
    ac.indexOf("one-time-code") >= 0 ||
    ac.indexOf("username") >= 0 ||
    ac.indexOf("cc-") >= 0
  );
}
`,
    // IFRAME/EMBED/OBJECT are hard-excluded: the runtime never assigns their src/data (Marketplace round-6 —
    // externally hosted embeds must not be an independently changeable runtime surface). The early return also
    // prevents the textContent fallback from writing into embed fallback content.
    `function applyValue(el, v) {
  v = String(v == null ? "" : v);
  var tag = String(el.tagName || "").toUpperCase();
  if (tag === "IFRAME" || tag === "EMBED" || tag === "OBJECT") return;
  if (bIsRichTextEl(el)) {
    var sh = bSafeHtml(v);
    if (sh == null) {
      el.textContent = v;
    } else {
      bRenderNodes(el, sh);
    }
    return;
  }
  if (tag === "IMG" || tag === "SOURCE") {
    bApplyImageSrc(el, v);
    return;
  }
  if (tag === "PICTURE") {
    bApplyImageToContainer(el, v);
    return;
  }
  if (bLooksLikeImageUrl(v) && bApplyImageToContainer(el, v)) return;
  if (tag === "A" && bLooksLikeImageUrl(v) && el.querySelector && el.querySelector("img")) {
    bApplyImageToContainer(el, v);
    return;
  }
  if (tag === "A") {
    bApplyLink(el, v);
    return;
  }
  if (tag === "INPUT") {
    if (bIsCredentialField(el)) return;
    var type = String(el.type || "").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      el.checked = !!(v && v !== "0" && v !== "false" && v.toLowerCase() !== "off");
    } else {
      el.value = v;
    }
    return;
  }
  if (tag === "TEXTAREA" || tag === "SELECT") {
    if (bIsCredentialField(el)) return;
    el.value = v;
    return;
  }
  el.textContent = v;
}
`,
  ].join("");
}

/**
 * Readable hide/reveal helpers for the footer runtime, including Webflow conditional visibility on ancestors.
 * Reveal strips `w-condition-invisible` only from ancestors that already carry it.
 * Conceal re-hides the tagged node and at most its conditional wrapper — never the whole component row.
 */
export function beaconPropVisibilityRuntimeSource(): string {
  const cls = runtimeStringLiteral(WEBFLOW_CONDITION_INVISIBLE_CLASS);
  const url = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_URL);
  const text = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_TEXT);
  const assetName = runtimeStringLiteral(CMS_SLOT_PUBLISH_PLACEHOLDER_ASSET_NAME);
  return [
    `function bPropSetHidden(n, h) {
  if (h) {
    n.setAttribute("hidden", "");
    n.setAttribute("aria-hidden", "true");
  } else {
    n.removeAttribute("hidden");
    n.removeAttribute("aria-hidden");
  }
}
`,
    `function bPropReveal(n, row) {
  bPropSetHidden(n, false);
  var cur = n === row ? null : n.parentElement;
  while (cur && cur !== row) {
    if (cur.classList.contains(${cls})) {
      cur.classList.remove(${cls});
      cur.style.removeProperty("display");
      cur.style.removeProperty("visibility");
    }
    cur = cur.parentElement;
  }
}
`,
    `function bPropConceal(n, row) {
  bPropSetHidden(n, true);
  var cur = n === row ? null : n.parentElement,
    touched = false;
  while (cur && cur !== row) {
    if (cur.classList.contains(${cls})) {
      cur.style.setProperty("display", "none");
      cur.style.removeProperty("visibility");
      touched = true;
    }
    cur = cur.parentElement;
  }
  if (!touched && n !== row) {
    var p = n.parentElement;
    if (p && p !== row) {
      p.classList.add(${cls});
      p.style.setProperty("display", "none");
    }
  }
}
`,
    `function bIsPlaceholderImageSrc(s) {
  s = String(s || "");
  return s === ${url} || s.indexOf(${assetName}) >= 0;
}
`,
    `function bPropClearPublishPlaceholder(n) {
  var tag = String(n.tagName || "").toUpperCase();
  if (tag === "SOURCE") {
    var ss = n.getAttribute("srcset") || "";
    if (bIsPlaceholderImageSrc(ss) || ss.indexOf(${assetName}) >= 0) n.removeAttribute("srcset");
    return;
  }
  if (tag === "IMG") {
    var s = n.getAttribute("src") || "";
    if (bIsPlaceholderImageSrc(s)) n.removeAttribute("src");
    return;
  }
  if (tag === "A") {
    var h = n.getAttribute("href") || "";
    if (h === ${url}) n.removeAttribute("href");
    return;
  }
  var pic = n.querySelector && n.querySelector("picture");
  if (pic) {
    var sources = pic.querySelectorAll("source"),
      i;
    for (i = 0; i < sources.length; i++) {
      var si = sources[i].getAttribute("srcset") || "";
      if (bIsPlaceholderImageSrc(si) || si.indexOf(${assetName}) >= 0) sources[i].removeAttribute("srcset");
    }
  }
  var img = n.querySelector && n.querySelector("img");
  if (img) {
    var si = img.getAttribute("src") || "";
    if (bIsPlaceholderImageSrc(si)) img.removeAttribute("src");
  }
  var t = n.textContent || "";
  if (t === ${text}) n.textContent = "";
}
`,
  ].join("");
}
