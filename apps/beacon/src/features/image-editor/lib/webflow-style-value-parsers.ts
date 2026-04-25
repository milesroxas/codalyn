/**
 * Best-effort parsing of `aspect-ratio` values returned from Webflow
 * `Style.getProperties({ breakpoint: "main" })`.
 *
 * Pixel length parsing is intentionally out of scope: authors rarely set
 * explicit `px` on images in Webflow, and Designer returns `%`, `vw`, `fr`,
 * `auto`, etc. that cannot be resolved without a layout engine.
 */

function ratioFromTwoNumberStrings(a: string, b: string): number | undefined {
  if (!a || !b) {
    return undefined;
  }
  const n1 = parseFloat(a);
  const n2 = parseFloat(b);
  if (Number.isFinite(n1) && Number.isFinite(n2) && n1 > 0 && n2 > 0) {
    return n1 / n2;
  }
  return undefined;
}

function tryAspectFromDelimiter(s: string, delimiter: string): number | undefined {
  if (!s.includes(delimiter)) {
    return undefined;
  }
  const p = s.split(delimiter).map((x) => x.trim());
  if (p.length === 2) {
    return ratioFromTwoNumberStrings(p[0] || "", p[1] || "");
  }
  return undefined;
}

function parseAspectRatioString(s: string): number | undefined {
  if (s.length === 0 || s === "auto") {
    return undefined;
  }
  const sTrim = s.trim();
  const fromColon = tryAspectFromDelimiter(sTrim, ":");
  if (fromColon != null) {
    return fromColon;
  }
  const fromSlash = tryAspectFromDelimiter(sTrim, "/");
  if (fromSlash != null) {
    return fromSlash;
  }
  const n = parseFloat(s);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return undefined;
}

function parseAspectRatioObject(o: Record<string, unknown>): number | undefined {
  const a = o.numerator;
  const b = o.denominator;
  if (typeof a === "number" && typeof b === "number" && a > 0 && b > 0) {
    return a / b;
  }
  if (o.value != null) {
    return parseAspectRatioFromStyleValue(o.value);
  }
  return undefined;
}

export function parseAspectRatioFromStyleValue(v: unknown): number | undefined {
  if (v == null) {
    return undefined;
  }
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return v;
  }
  if (typeof v === "string") {
    return parseAspectRatioString(v.trim());
  }
  if (typeof v === "object" && v !== null) {
    return parseAspectRatioObject(v as Record<string, unknown>);
  }
  return undefined;
}

/**
 * Picks a merged property value for `aspect-ratio` when Webflow’s keys differ
 * (kebab, camel) or a variable-like object is stored under another name.
 */
function getAspectPropFromMerged(merged: Record<string, unknown>): unknown {
  const candidates = ["aspect-ratio", "aspectRatio", "AspectRatio", "webkit-aspect-ratio"];
  for (const k of candidates) {
    if (k in merged && merged[k] != null) {
      return merged[k];
    }
  }
  for (const [k, val] of Object.entries(merged)) {
    if (val == null) {
      continue;
    }
    const kl = k.toLowerCase();
    if (kl === "aspect-ratio" || kl === "aspectratio" || (kl.includes("aspect") && kl.includes("ratio"))) {
      return val;
    }
  }
  return undefined;
}

/**
 * Raw `aspect-ratio` value from a single `Style.getProperties(…)` payload (or inline style map).
 * Used when `getProperty("aspect-ratio", …)` is null but the property still exists on the style map.
 */
export function getRawAspectValueFromPropertyMap(props: Record<string, unknown> | null | undefined): unknown {
  if (props == null) {
    return undefined;
  }
  return getAspectPropFromMerged(props);
}

/**
 * Parses `aspect-ratio` (width / height) from a merged, **materialized** style record,
 * returning `undefined` when absent or unresolvable (e.g. `auto`).
 */
export function parseAspectRatioFromMergedStyle(merged: Record<string, unknown>): number | undefined {
  return parseAspectRatioFromStyleValue(getAspectPropFromMerged(merged));
}
