/**
 * Boundary model for Composer **link** props (`valueType: "link"`).
 *
 * A link carries more than a bare URL: a *kind* (external URL, site page, CMS collection entry), the resolved
 * `href`, an "open in new tab" flag, and (for page / CMS kinds) the stable Webflow ids used to restore the picker
 * selection. The value is serialized as a compact JSON string into the same per-prop `propValues` slot that other
 * props use, so it round-trips through the runtime payload `p[propId]` (see {@link decodeBeaconLinkValue}).
 *
 * Backward compatibility: a legacy **bare string** (any value that is not our JSON envelope) is treated as an
 * external URL with the historical "current tab" behavior, so already-published links keep working.
 *
 * Per CLAUDE.md: external values are normalized into a runtime union before logic uses them, matching is by stable
 * ids (never labels), and malformed envelopes degrade to an explicit empty/`url` state instead of partial application.
 */

export type BeaconLinkKind = "url" | "page" | "cms";

export type BeaconLinkValue = {
  kind: BeaconLinkKind;
  /** External absolute URL for `url`; site-relative path (leading `/`) for `page` / `cms`. */
  href: string;
  /** `true` → `target="_blank"` + `rel="noopener noreferrer"` at runtime. */
  newTab: boolean;
  /** Webflow page id when `kind === "page"` (restores the page picker selection). */
  pageId?: string;
  /** Webflow collection id when `kind === "cms"`. */
  collectionId?: string;
  /** Webflow collection item id when `kind === "cms"`. */
  itemId?: string;
};

/** Compact on-the-wire envelope (`k`ind, `h`ref, `t`arget-new-tab, `p`ageId, `c`ollectionId, `e`ntryId). */
type BeaconLinkEnvelope = {
  k?: unknown;
  h?: unknown;
  t?: unknown;
  p?: unknown;
  c?: unknown;
  e?: unknown;
};

const LINK_KINDS: ReadonlySet<BeaconLinkKind> = new Set(["url", "page", "cms"]);

/** External links default to a new tab; internal page / CMS links stay in the current tab. */
function defaultNewTabForKind(kind: BeaconLinkKind): boolean {
  return kind === "url";
}

/** Reads a primitive- or wrapped-string boundary value (`"x"` or `{ value: "x" }`) into a trimmed string or null. */
function readStringLikeValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }
  if (raw != null && typeof raw === "object" && "value" in raw) {
    return readStringLikeValue((raw as { value: unknown }).value);
  }
  return null;
}

/** Coerces the boundary "new tab" flag from boolean / number / string forms. */
function readNewTabFlag(raw: unknown, fallback: boolean): boolean {
  if (raw === true || raw === 1) {
    return true;
  }
  if (raw === false || raw === 0) {
    return false;
  }
  if (typeof raw === "string") {
    const t = raw.trim().toLowerCase();
    if (t === "1" || t === "true") {
      return true;
    }
    if (t === "0" || t === "false" || t === "") {
      return false;
    }
  }
  return fallback;
}

function readKind(raw: unknown): BeaconLinkKind {
  if (typeof raw === "string" && LINK_KINDS.has(raw as BeaconLinkKind)) {
    return raw as BeaconLinkKind;
  }
  return "url";
}

/** True for Webflow `valueType`s that render the rich link picker (kept narrow per product scope: link only). */
export function isCmsSlotLinkValueType(valueType: string): boolean {
  return valueType === "link";
}

const EMPTY_URL_LINK: BeaconLinkValue = { kind: "url", href: "", newTab: true };

/**
 * Normalizes a stored prop string into a {@link BeaconLinkValue}. Accepts the JSON envelope, a legacy bare URL,
 * and missing / malformed input (→ empty external link). Never throws.
 */
/** Parses the JSON envelope, or null when `trimmed` is not a usable object. */
function parseLinkEnvelope(trimmed: string): BeaconLinkEnvelope | null {
  try {
    const obj: unknown = JSON.parse(trimmed);
    return obj != null && typeof obj === "object" ? (obj as BeaconLinkEnvelope) : null;
  } catch {
    return null;
  }
}

/** Copies only the stable ids that belong to `value.kind` (never partially applies foreign-kind ids). */
function applyEnvelopeIds(value: BeaconLinkValue, parsed: BeaconLinkEnvelope): void {
  if (value.kind === "page") {
    const pageId = readStringLikeValue(parsed.p);
    if (pageId != null) {
      value.pageId = pageId;
    }
    return;
  }
  if (value.kind === "cms") {
    const collectionId = readStringLikeValue(parsed.c);
    const itemId = readStringLikeValue(parsed.e);
    if (collectionId != null) {
      value.collectionId = collectionId;
    }
    if (itemId != null) {
      value.itemId = itemId;
    }
  }
}

export function decodeBeaconLinkValue(raw: string | null | undefined): BeaconLinkValue {
  const trimmed = raw == null ? "" : raw.trim();
  if (trimmed === "") {
    return { ...EMPTY_URL_LINK };
  }
  const parsed = trimmed.charAt(0) === "{" ? parseLinkEnvelope(trimmed) : null;
  if (parsed == null) {
    // Legacy bare string (or JSON-looking-but-invalid): an external URL with historical current-tab behavior.
    return { kind: "url", href: trimmed, newTab: false };
  }
  const kind = readKind(parsed.k);
  const value: BeaconLinkValue = {
    kind,
    href: readStringLikeValue(parsed.h) ?? "",
    newTab: readNewTabFlag(parsed.t, defaultNewTabForKind(kind)),
  };
  applyEnvelopeIds(value, parsed);
  return value;
}

/**
 * Serializes a {@link BeaconLinkValue} back to the stored prop string.
 * - No `href` → `""` (unset; the runtime falls open to the authored default).
 * - Plain external URL in the current tab → bare string (legacy-compatible, smallest payload).
 * - Otherwise → compact JSON envelope.
 */
export function encodeBeaconLinkValue(value: BeaconLinkValue): string {
  const href = value.href.trim();
  if (href === "") {
    return "";
  }
  if (value.kind === "url" && !value.newTab) {
    return href;
  }
  const envelope: BeaconLinkEnvelope = { k: value.kind, h: href };
  if (value.newTab) {
    envelope.t = 1;
  }
  if (value.kind === "page" && value.pageId) {
    envelope.p = value.pageId;
  }
  if (value.kind === "cms") {
    if (value.collectionId) {
      envelope.c = value.collectionId;
    }
    if (value.itemId) {
      envelope.e = value.itemId;
    }
  }
  return JSON.stringify(envelope);
}

/**
 * Canonical runtime string for a link prop: decode + re-encode so malformed envelopes are repaired and links with no
 * `href` collapse to `""`. Used when building the published `p[propId]` row.
 */
export function beaconLinkRuntimeValue(raw: string | null | undefined): string {
  return encodeBeaconLinkValue(decodeBeaconLinkValue(raw));
}
