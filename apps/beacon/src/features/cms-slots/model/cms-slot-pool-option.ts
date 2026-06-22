/**
 * A **pool option** identifies one distinct clone source (hidden-list seed) for a CMS slot. Historically a seed was
 * identified by `componentId` alone, so the same component could appear in the pool only once. Component **variants**
 * (e.g. split-content `image-left` / `image-right`) require the *same* `componentId` to appear more than once, each
 * seed pinned to a different variant. The pool option key therefore composes `componentId` with the selected
 * `variantId`.
 *
 * `variantId === null` means "no variant pinned" — the base variant, or a component with no variant prop. Bare
 * `componentId` keys (no delimiter) decode to this, keeping every pre-variant stored value backward compatible.
 *
 * Boundary rule (CLAUDE.md): keys are matched by stable ids only (`componentId`/`variantId`), never display labels.
 */

export type CmsSlotPoolOption = {
  componentId: string;
  /** Selected Webflow variant option id, or `null` for the base / no-variant seed. */
  variantId: string | null;
};

/**
 * Separator between `componentId` and `variantId` in a serialized pool-option key. Webflow component/variant ids are
 * alphanumeric/hyphen tokens (and the literal `"base"`), so `~` never collides; parsing splits on the **first**
 * occurrence, keeping the key stable even if a variant id ever contained one.
 */
const POOL_OPTION_KEY_DELIM = "~";

/** Stable string key for maps/dedup/persistence. Base/no-variant seeds serialize to the bare `componentId`. */
export function poolOptionKey(option: CmsSlotPoolOption): string {
  const componentId = option.componentId.trim();
  const variantId = option.variantId?.trim() ?? "";
  if (componentId.length === 0) {
    return "";
  }
  return variantId.length === 0 ? componentId : `${componentId}${POOL_OPTION_KEY_DELIM}${variantId}`;
}

/**
 * Parses a serialized pool-option key. Returns `null` for empty/whitespace or a key with no `componentId`
 * (e.g. a leading delimiter). A trailing/empty variant segment normalizes to the base seed (`variantId: null`).
 */
export function parsePoolOptionKey(raw: string | null | undefined): CmsSlotPoolOption | null {
  const t = (raw ?? "").trim();
  if (t.length === 0) {
    return null;
  }
  const at = t.indexOf(POOL_OPTION_KEY_DELIM);
  if (at < 0) {
    return { componentId: t, variantId: null };
  }
  const componentId = t.slice(0, at).trim();
  if (componentId.length === 0) {
    return null;
  }
  const variantId = t.slice(at + POOL_OPTION_KEY_DELIM.length).trim();
  return { componentId, variantId: variantId.length === 0 ? null : variantId };
}

/** True when two pool options refer to the same seed (component + pinned variant). */
export function poolOptionsEqual(a: CmsSlotPoolOption, b: CmsSlotPoolOption): boolean {
  return poolOptionKey(a) === poolOptionKey(b) && poolOptionKey(a).length > 0;
}

/** De-duplicated pool-option keys in first-seen order; blanks dropped. */
export function dedupePoolOptionKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    const option = parsePoolOptionKey(raw);
    if (option === null) {
      continue;
    }
    const key = poolOptionKey(option);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}
