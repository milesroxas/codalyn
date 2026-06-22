/**
 * Boundary reader (CLAUDE.md): normalizes the **selected variant** of a hidden-list seed from the runtime-union value
 * shapes Webflow's `instance.searchProps()` returns. A component variant prop (`valueType === "variant"`) carries the
 * available choices in `display.options` and the current selection in `value` (a `StaticPropValue`) / `resolvedValue`.
 *
 * Matching is by stable **id** only — never `display.options[].name` (a value that equals an option's label but not its
 * id is rejected). Missing/unknown/base selections return `null` (the base seed), never an invented fallback.
 */

/** Webflow variant ids: the author-defined base variant is always `"base"`; it is the same as "no variant pinned". */
const BASE_VARIANT_ID = "base";

/** The variant a seed is pinned to, with the prop needed to re-apply it via `instance.setProps`. */
export type CmsSlotSelectedVariant = {
  /** `propId` of the `variant` prop — required to re-set the variant after a pool rebuild. */
  propId: string;
  /** Selected variant option id (never the base id). */
  variantId: string;
  /** Human label for the option (`display.options[].name`, falling back to the id). */
  variantName: string;
};

/** Structural subset of one `InstanceProp` row (from `searchProps()`); avoids coupling to the full SDK type. */
export type InstancePropForVariant = {
  propId: string;
  valueType: string;
  value?: unknown;
  resolvedValue?: unknown;
  defaultValue?: unknown;
  display?: { options?: ReadonlyArray<{ id: string; name?: string | null }> | null } | null;
};

/** Reads a string-like id from primitive, wrapped (`{ value }`), or static-prop (`{ sourceType, value }`) shapes. */
function readVariantIdLike(raw: unknown): string | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (raw != null && typeof raw === "object" && "value" in raw) {
    return readVariantIdLike((raw as { value: unknown }).value);
  }
  return null;
}

/** Selected option id from a variant prop: prefers the static override, then resolved, then default. */
function selectedVariantIdFromProp(prop: InstancePropForVariant): string | null {
  return readVariantIdLike(prop.value) ?? readVariantIdLike(prop.resolvedValue) ?? readVariantIdLike(prop.defaultValue);
}

/** Matches a selected id to a defined option (case-insensitive id fallback, mirroring prop-id matching elsewhere). */
function matchVariantOption(
  options: ReadonlyArray<{ id: string; name?: string | null }>,
  selectedId: string
): { id: string; name?: string | null } | null {
  for (const o of options) {
    if (o.id === selectedId) {
      return o;
    }
  }
  const lower = selectedId.toLowerCase();
  for (const o of options) {
    if (o.id.toLowerCase() === lower) {
      return o;
    }
  }
  return null;
}

/**
 * Returns the seed's pinned variant, or `null` when the instance has no variant prop, sits on the base variant, or the
 * stored selection does not match any defined option (no invented fallback). When a component exposes more than one
 * variant prop, the **first** one with a valid selection identifies the seed (single-variant model; combos are out of
 * scope by design).
 */
/** Resolves a single prop to its pinned variant, or `null` when it is not a usable variant selection. */
function selectedVariantFromProp(prop: InstancePropForVariant): CmsSlotSelectedVariant | null {
  if (prop.valueType !== "variant") {
    return null;
  }
  const options = prop.display?.options;
  if (options == null || options.length === 0) {
    return null;
  }
  const selectedId = selectedVariantIdFromProp(prop);
  if (selectedId == null || selectedId === BASE_VARIANT_ID) {
    return null;
  }
  const match = matchVariantOption(options, selectedId);
  if (match == null || match.id === BASE_VARIANT_ID) {
    return null;
  }
  const name = typeof match.name === "string" && match.name.trim().length > 0 ? match.name : match.id;
  return { propId: prop.propId, variantId: match.id, variantName: name };
}

export function readSelectedVariantFromInstanceProps(
  props: ReadonlyArray<InstancePropForVariant>
): CmsSlotSelectedVariant | null {
  for (const prop of props) {
    const variant = selectedVariantFromProp(prop);
    if (variant != null) {
      return variant;
    }
  }
  return null;
}

/** The variant **control** for a seed: the prop to write, the choices, and the current selection. */
export type CmsSlotVariantControl = {
  /** `propId` of the `variant` prop — the target of `instance.setProps`. */
  propId: string;
  /** Selectable variants, with a synthetic `"base"` entry first. */
  options: ReadonlyArray<{ id: string; name: string }>;
  /** Currently selected variant id (`"base"` when on base / unset). */
  selectedId: string;
};

/** Display name for the synthetic base option in a variant picker. */
export const CMS_SLOT_BASE_VARIANT_LABEL = "Base";

/**
 * Reads the editable variant control from a seed's instance props: the first `variant` prop with defined options, its
 * choices (base prepended), and the current selection. Returns `null` when the component has no variant prop, so the
 * Designer UI only shows a picker for components that actually have variants.
 */
function variantControlFromProp(prop: InstancePropForVariant): CmsSlotVariantControl | null {
  if (prop.valueType !== "variant") {
    return null;
  }
  const defined = prop.display?.options;
  if (defined == null || defined.length === 0) {
    return null;
  }
  const options: Array<{ id: string; name: string }> = [{ id: BASE_VARIANT_ID, name: CMS_SLOT_BASE_VARIANT_LABEL }];
  for (const o of defined) {
    if (o.id === BASE_VARIANT_ID) {
      continue;
    }
    options.push({ id: o.id, name: typeof o.name === "string" && o.name.trim().length > 0 ? o.name : o.id });
  }
  const selected = selectedVariantFromProp(prop);
  return { propId: prop.propId, options, selectedId: selected?.variantId ?? BASE_VARIANT_ID };
}

export function readVariantControlFromInstanceProps(
  props: ReadonlyArray<InstancePropForVariant>
): CmsSlotVariantControl | null {
  for (const prop of props) {
    const control = variantControlFromProp(prop);
    if (control != null) {
      return control;
    }
  }
  return null;
}

/** True when a variant id is the base (no pin). */
export function isBaseVariantId(variantId: string): boolean {
  return variantId === BASE_VARIANT_ID;
}

/** Composes the Composer/palette label for a seed: `"Component"` or `"Component · Variant"`. */
export function poolOptionLabel(componentName: string, variant: CmsSlotSelectedVariant | null): string {
  const base = componentName.trim().length > 0 ? componentName.trim() : componentName;
  if (variant == null) {
    return base;
  }
  return `${base} · ${variant.variantName}`;
}
