import { materializeAspectRatioInMergedStyle } from "@/features/image-editor/lib/materialize-webflow-style-property-values";
import {
  getRawAspectValueFromPropertyMap,
  parseAspectRatioFromMergedStyle,
} from "@/features/image-editor/lib/webflow-style-value-parsers";

const LAYOUT_STYLE_PROPS = [
  "width",
  "height",
  "max-width",
  "max-height",
  "min-width",
  "min-height",
  "aspect-ratio",
] as const satisfies ReadonlyArray<keyof PropertyMap>;

const ASPECT_RATIO_KEY = "aspect-ratio" as const satisfies keyof PropertyMap;

/** Prefer desktop-first; include `main` and common overrides where `aspect-ratio` is often authored. */
const ASPECT_RATIO_BREAKPOINTS: Array<"main" | "large" | "xl" | "xxl" | "medium" | "small" | "tiny"> = [
  "main",
  "large",
  "xl",
  "xxl",
  "medium",
  "small",
  "tiny",
];

export type ElementStyleMerge = {
  /** Class names applied to this element, in Designer order. Used for diagnostics. */
  classNames: string[];
  /**
   * The 7 layout CSS values as Webflow returned them, merged across all classes. Variable
   * objects are unresolved here so Phase 0 diagnostics can see the original payload.
   */
  rawLayoutProps: Record<string, unknown>;
  /**
   * Parsed `aspect-ratio` (width / height), materialized through variable references.
   * `undefined` when absent, `auto`, or otherwise unresolvable.
   */
  aspectRatio: number | undefined;
};

function extractLayoutProps(merged: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of LAYOUT_STYLE_PROPS) {
    if (k in merged && merged[k] != null) {
      out[k] = merged[k];
    }
  }
  return out;
}

/**
 * Merges `getProperties()` for one **Style** object (a single class / combo). Combo classes in
 * Webflow often store **overrides** on the child; the parent’s properties live on `getParent()`.
 * See `resolveStyleWithParentChain`.
 */
async function mergeSingleStyleLayer(st: Style): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};
  let pFallback: Record<string, unknown> = {};
  try {
    pFallback = (await st.getProperties()) as Record<string, unknown>;
  } catch {
    pFallback = {};
  }
  let pMain: Record<string, unknown> = {};
  try {
    pMain = (await st.getProperties({ breakpoint: "main" })) as Record<string, unknown>;
  } catch {
    pMain = {};
  }
  Object.assign(merged, pFallback, pMain);
  try {
    for (const bp of ASPECT_RATIO_BREAKPOINTS) {
      let g: unknown = (await st.getProperty(ASPECT_RATIO_KEY, { breakpoint: bp })) as unknown;
      if (g == null) {
        const propsBp = (await st.getProperties({ breakpoint: bp }).catch(() => null)) as Record<
          string,
          unknown
        > | null;
        g = getRawAspectValueFromPropertyMap(propsBp ?? undefined);
      }
      if (g == null) {
        continue;
      }
      const trial = { [ASPECT_RATIO_KEY]: g };
      const mat = await materializeAspectRatioInMergedStyle(trial);
      const ar = parseAspectRatioFromMergedStyle(mat);
      if (ar != null && Number.isFinite(ar) && ar > 0) {
        merged[ASPECT_RATIO_KEY] = g;
        break;
      }
    }
  } catch {
    /* no aspect-ratio on this style */
  }
  return merged;
}

function styleIsComboClass(s: Style): boolean {
  try {
    return s.isComboClass() === true;
  } catch {
    return false;
  }
}

type ResolveStyleOptions = {
  /**
   * Previous class in `getStyles()` / Designer class-list order. When a combo’s `getParent()` is
   * missing, Webflow can still return **only** the combo `Style` with **no** `getParent()` link;
   * `aspect-ratio` may then be missing on `getProperties()` for that object alone. Prepending
   * the prior class on the same element recreates base → combo merging.
   */
  previousInClassList: Style | null;
};

/**
 * Walks from `st` to root via `getParent()`, returns styles **root → leaf** (base → … → `st`),
 * with cycle / missing-parent guards.
 */
async function styleParentChainRootToLeaf(st: Style): Promise<Style[]> {
  const chain: Style[] = [];
  let cur: Style | null = st;
  const seen = new Set<string>();
  while (cur != null) {
    const id = cur.id;
    if (typeof id === "string" && id.length > 0) {
      if (seen.has(id)) {
        break;
      }
      seen.add(id);
    }
    chain.push(cur);
    try {
      cur = await cur.getParent();
    } catch {
      break;
    }
  }
  chain.reverse();
  return chain;
}

/**
 * Resolves a **Style** the way the Designer’s Styles panel does: the combo’s effective rules are
 * the parent style(s) in the `getParent()` chain, then this style’s overrides. If the API omits
 * `getParent()` for a combo, the previous class in the element’s `getStyles()` order is used as a
 * synthetic base so combo-only rules (e.g. `aspect-ratio` on `is-1-1`) still read correctly.
 */
async function resolveStyleWithParentChain(st: Style, options?: ResolveStyleOptions): Promise<Record<string, unknown>> {
  const chain = await styleParentChainRootToLeaf(st);
  const prev = options?.previousInClassList ?? null;
  if (prev != null && styleIsComboClass(st) && chain.length === 1 && chain[0] === st) {
    const prevId = prev.id;
    const stId = st.id;
    if (typeof prevId === "string" && prevId.length > 0 && prevId !== stId) {
      chain.unshift(prev);
    }
  }
  const out: Record<string, unknown> = {};
  for (const s of chain) {
    const layer = await mergeSingleStyleLayer(s);
    Object.assign(out, layer);
  }
  return out;
}

async function readClassName(st: Style): Promise<string | null> {
  try {
    const n = await st.getName();
    if (typeof n === "string" && n.length > 0) {
      return n;
    }
  } catch {
    /* name unavailable */
  }
  return null;
}

const EMPTY_MERGE: ElementStyleMerge = {
  classNames: [],
  rawLayoutProps: {},
  aspectRatio: undefined,
};

/**
 * Merges all style rules applied to a Designer element (later classes win on duplicate
 * keys). Each class is resolved with its `Style.getParent()` chain so **combo** utilities (e.g.
 * `is-1-1`) contribute `aspect-ratio` defined on a parent in the style system, not only deltas on
 * the child style object.
 */
export async function mergeWebflowElementStyleProperties(el: AnyElement): Promise<ElementStyleMerge> {
  const e = el as { getStyles?: () => Promise<unknown> };
  if (typeof e.getStyles !== "function") {
    return EMPTY_MERGE;
  }
  try {
    const styles = (await e.getStyles()) as (Style | null)[] | null;
    if (styles == null) {
      return EMPTY_MERGE;
    }
    const list: Style[] = [];
    for (const s of styles) {
      if (s != null) {
        list.push(s as Style);
      }
    }
    /** `getStyles()` is usually base → combo; if it is [combo, base], a later pass can overwrite the combo’s `aspect-ratio` (e.g. with `auto` from the base). */
    if (list.length === 2) {
      const a = list[0] as Style;
      const b = list[1] as Style;
      if (styleIsComboClass(a) && !styleIsComboClass(b) && a.id !== b.id) {
        list.reverse();
      }
    }
    const merged: Record<string, unknown> = {};
    const classNames: string[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i] as Style;
      const name = await readClassName(s);
      if (name != null) {
        classNames.push(name);
      }
      const layer = await resolveStyleWithParentChain(s, {
        previousInClassList: i > 0 ? (list[i - 1] as Style) : null,
      });
      Object.assign(merged, layer);
    }
    const materialized = await materializeAspectRatioInMergedStyle(merged);
    return {
      classNames,
      rawLayoutProps: extractLayoutProps(merged),
      aspectRatio: parseAspectRatioFromMergedStyle(materialized),
    };
  } catch {
    return EMPTY_MERGE;
  }
}
