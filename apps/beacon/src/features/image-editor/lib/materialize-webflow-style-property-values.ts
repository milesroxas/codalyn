/**
 * Webflow `Style.getProperties()` often returns **variable** objects (`{ type, get() }`) or
 * plain `{ value, unit }` snapshots. Our aspect-ratio parser expects strings/numbers; we
 * materialize the aspect-ratio value into a CSS-like string before parsing.
 */
const MAX_VAR_DEPTH = 8;

function isAspectPropertyKey(k: string): boolean {
  const kl = k.toLowerCase();
  if (kl === "aspect-ratio" || kl === "aspectratio" || kl === "webkit-aspect-ratio") {
    return true;
  }
  return kl.includes("aspect") && kl.includes("ratio");
}

function valueUnitToString(o: Record<string, unknown>): string | null {
  const val = o.value;
  const unit = o.unit;
  if (typeof val === "number" && Number.isFinite(val) && typeof unit === "string") {
    return unit === "%" ? `${val}%` : `${val}${unit}`;
  }
  return null;
}

async function unwrapVariableGet(
  o: { get: (opts?: unknown) => Promise<unknown>; type: string },
  v: unknown,
  depth: number
): Promise<unknown> {
  try {
    const next = await o.get();
    return materializeStyleValue(next, depth + 1);
  } catch {
    return v;
  }
}

async function materializeStyleValue(v: unknown, depth: number): Promise<unknown> {
  if (v == null || depth > MAX_VAR_DEPTH) {
    return v;
  }
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean" || t !== "object") {
    return v;
  }
  const o = v as Record<string, unknown> & { get?: (opts?: unknown) => Promise<unknown>; type?: string };
  if (typeof o.get === "function" && typeof o.type === "string" && o.type.length > 0) {
    return unwrapVariableGet(o as { get: (opts?: unknown) => Promise<unknown>; type: string }, v, depth);
  }
  if ("value" in o && "unit" in o) {
    const s = valueUnitToString(o);
    if (s != null) {
      return s;
    }
  }
  return v;
}

/**
 * Resolves variable references on **aspect-related** keys of a merged style record
 * (`aspect-ratio` and kebab/camel variants Webflow may use), leaving other keys untouched.
 */
export async function materializeAspectRatioInMergedStyle(
  merged: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const out = { ...merged };
  for (const k of Object.keys(out)) {
    if (!isAspectPropertyKey(k)) {
      continue;
    }
    const v = out[k];
    if (v == null) {
      continue;
    }
    out[k] = await materializeStyleValue(v, 0);
  }
  return out;
}
