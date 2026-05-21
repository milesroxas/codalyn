import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import { exitCurrentComponentIfAny } from "@/features/image-editor/lib/with-image-element-for-page-target";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

/** Filter Designer console DevTools with this string to trace Engine “Tag data attributes on component”. */
export const CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX = "[Beacon tag attrs]" as const;

function debugTagAttrsLog(stage: string, detail?: Record<string, unknown>): void {
  console.log(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, stage, detail ?? {});
}

function debugTagAttrsErr(stage: string, err: unknown, extra?: Record<string, unknown>): void {
  console.error(CMS_SLOT_TAG_ATTRS_DEBUG_PREFIX, stage, {
    ...extra,
    message: err instanceof Error ? err.message : String(err),
    causeTag: webflowDesignerErrorCauseTag(err),
    err,
  });
}

const MAX_NESTED_COMPONENT_EXITS = 8;

/** Exit nested component edit scope until `getCurrentComponent()` is null, so `enterComponent(instance)` can run. */
async function exitUntilPageForInstanceEnter(): Promise<void> {
  for (let step = 0; step < MAX_NESTED_COMPONENT_EXITS; step += 1) {
    await exitCurrentComponentIfAny();
    if ((await webflow.getCurrentComponent().catch(() => null)) == null) {
      return;
    }
  }
}

const ATTR = "data-codalyn-beacon-prop";

export type EngineCodalynAttrSyncResult = {
  tagged: number;
  removed: number;
  variantsWalked: number;
  errors: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** `getSettings()` rows and nested instance `getProps()` values: `{ sourceType: "prop", propId }` (flat or nested under `value`). */
function bindingPropIdFromSettingValue(v: unknown): string | null {
  if (!isRecord(v)) {
    return null;
  }
  const fromBindingShape = (row: Record<string, unknown>): string | null => {
    if (row.sourceType !== "prop") {
      return null;
    }
    const id = row.propId;
    return typeof id === "string" && id.length > 0 ? id : null;
  };
  const direct = fromBindingShape(v);
  if (direct != null) {
    return direct;
  }
  const inner = v.value;
  if (!isRecord(inner)) {
    return null;
  }
  return fromBindingShape(inner);
}

function attrValueStillWanted(value: string, exposedIds: ReadonlySet<string>): boolean {
  for (const part of value.split("|")) {
    const t = part.trim();
    if (t.length > 0 && exposedIds.has(t)) {
      return true;
    }
  }
  return false;
}

function hasElementSettings(el: AnyElement): boolean {
  return "elementSettings" in el && (el as { elementSettings?: boolean }).elementSettings === true;
}

function hasChildren(el: AnyElement): el is AnyElement & { getChildren: () => Promise<AnyElement[]> } {
  return "children" in el && (el as { children?: boolean }).children === true;
}

type PropAttrOps = {
  get: (name: string) => Promise<null | string>;
  set: (name: string, value: string) => Promise<null>;
  remove: (name: string) => Promise<null>;
};

function propAttrOpsFor(el: AnyElement): PropAttrOps | null {
  if (el.type === "DOM") {
    const dom = el as DOMElement;
    return {
      get: (n) => dom.getAttribute(n),
      set: (n, v) => dom.setAttribute(n, v),
      remove: (n) => dom.removeAttribute(n),
    };
  }
  if ("customAttributes" in el && (el as { customAttributes?: boolean }).customAttributes === true) {
    const ca = el as AnyElement & {
      getCustomAttribute: (n: string) => Promise<null | string>;
      setCustomAttribute: (n: string, v: string) => Promise<null>;
      removeCustomAttribute: (n: string) => Promise<null>;
    };
    return {
      get: (n) => ca.getCustomAttribute(n),
      set: (n, v) => ca.setCustomAttribute(n, v),
      remove: (n) => ca.removeCustomAttribute(n),
    };
  }
  return null;
}

function canonicalExposedId(
  boundPropId: string,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>
): string | null {
  if (exposedIds.has(boundPropId)) {
    return boundPropId;
  }
  const mapped = nestedAlias.get(boundPropId);
  return mapped != null && exposedIds.has(mapped) ? mapped : null;
}

/**
 * Which nested instance props receive an exposed parent prop (directly or via an upstream nested alias).
 * Used to decide whether to `enterComponent` this instance and how to translate inner element bindings.
 */
export function mapNestedPropsToExposedIds(
  props: ReadonlyArray<{ propId: string; value: unknown }>,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string> = new Map()
): Map<string, string> {
  const alias = new Map<string, string>();
  for (const p of props) {
    const linked = bindingPropIdFromSettingValue(p.value);
    if (linked == null) {
      continue;
    }
    const canonical = exposedIds.has(linked) ? linked : upstreamAlias.get(linked);
    if (canonical != null && exposedIds.has(canonical)) {
      alias.set(p.propId, canonical);
    }
  }
  return alias;
}

async function nestedAliasForInstance(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>
): Promise<Map<string, string>> {
  const props = await inst.getProps().catch(() => [] as InstancePropSummary[]);
  return mapNestedPropsToExposedIds(props, exposedIds, upstreamAlias);
}

function collectExposedPropIdsFromSettings(
  settings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>
): string[] {
  const fromExpose: string[] = [];
  for (const v of Object.values(settings)) {
    const pid = bindingPropIdFromSettingValue(v);
    if (pid == null) {
      continue;
    }
    const canonical = canonicalExposedId(pid, exposedIds, nestedAlias);
    if (canonical != null) {
      fromExpose.push(canonical);
    }
  }
  return fromExpose;
}

function collectAllPropBindingPropIds(settings: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const v of Object.values(settings)) {
    const pid = bindingPropIdFromSettingValue(v);
    if (pid != null) {
      ids.push(pid);
    }
  }
  return ids;
}

type PropTagWalkDiag = {
  eligibleNodesChecked: number;
  designerBoundPropIds: Set<string>;
};

async function stripStaleCodalynAttr(
  attr: PropAttrOps,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">
): Promise<void> {
  try {
    const existing = await attr.get(ATTR);
    if (existing != null && existing.length > 0 && !attrValueStillWanted(existing, exposedIds)) {
      await attr.remove(ATTR);
      out.removed += 1;
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function applyCodalynAttrForBindings(
  attr: PropAttrOps,
  settings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  diag?: PropTagWalkDiag
): Promise<void> {
  try {
    if (diag != null) {
      diag.eligibleNodesChecked += 1;
      for (const pid of collectAllPropBindingPropIds(settings)) {
        diag.designerBoundPropIds.add(pid);
      }
    }
    const fromExpose = collectExposedPropIdsFromSettings(settings, exposedIds, nestedAlias);
    const uniq = [...new Set(fromExpose)].sort();
    if (uniq.length === 0) {
      return;
    }
    const nextVal = uniq.join("|");
    const cur = await attr.get(ATTR);
    if (cur !== nextVal) {
      await attr.set(ATTR, nextVal);
      out.tagged += 1;
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionIfLinked(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  diag: PropTagWalkDiag | undefined,
  depth: number
): Promise<void> {
  if (depth > MAX_NESTED_COMPONENT_EXITS) {
    return;
  }
  const link = await nestedAliasForInstance(inst, exposedIds, upstreamAlias);
  if (link.size === 0) {
    return;
  }
  const merged = new Map(upstreamAlias);
  for (const [k, v] of link) {
    merged.set(k, v);
  }
  let nestedName: string | undefined;
  try {
    nestedName = await (await inst.getComponent()).getName();
  } catch {
    /* optional */
  }
  debugTagAttrsLog("enter nested (props wired to exposed)", {
    depth,
    nestedName,
    nestedPropToExposed: Object.fromEntries(link),
  });
  try {
    await webflow.enterComponent(inst);
  } catch (e) {
    debugTagAttrsErr("enter nested failed", e, { depth, nestedName });
    out.errors.push(String(e instanceof Error ? e.message : e));
    return;
  }
  try {
    const root = await (await inst.getComponent()).getRootElement();
    if (root) {
      await walkTree(root, exposedIds, merged, out, diag, depth + 1);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function walkTree(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  diag: PropTagWalkDiag | undefined,
  nestedDepth: number
): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr) {
    await stripStaleCodalynAttr(attr, exposedIds, out);
  }
  if (hasElementSettings(el) && attr) {
    const settings = await (el as AnyElement & { getSettings: () => Promise<Record<string, unknown>> }).getSettings();
    await applyCodalynAttrForBindings(attr, settings, exposedIds, nestedAlias, out, diag);
  }
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await walkTree(ch, exposedIds, nestedAlias, out, diag, nestedDepth);
      }
    }
    await enterNestedDefinitionIfLinked(inst, exposedIds, nestedAlias, out, diag, nestedDepth);
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await walkTree(ch, exposedIds, nestedAlias, out, diag, nestedDepth);
    }
  }
}

function logDiagWhenNothingTagged(
  diag: PropTagWalkDiag,
  out: EngineCodalynAttrSyncResult,
  exposedIds: ReadonlySet<string>
): void {
  if (out.tagged !== 0 || out.removed !== 0 || exposedIds.size === 0) {
    return;
  }
  const overlap = [...exposedIds].filter((id) => diag.designerBoundPropIds.has(id));
  const stage =
    diag.eligibleNodesChecked === 0
      ? "no tags: no taggable elements with prop bindings on this variant"
      : overlap.length === 0
        ? "no tags: bindings use nested prop ids — wire nested instance props to exposed parent props, then retry"
        : "no writes: overlaps exist but ATTR unchanged (already synced?)";
  debugTagAttrsLog(stage, {
    eligibleNodesChecked: diag.eligibleNodesChecked,
    designerBoundPropIds: [...diag.designerBoundPropIds].sort(),
    exposedPropIds: [...exposedIds].sort(),
    idsInExposeAndOnBindings: overlap,
  });
}

type TagSyncEnteredGate = { entered: boolean };

async function enterComponentDefinitionsAndWalk(
  instance: ComponentElement,
  comp: Component,
  exposedIds: Set<string>,
  out: EngineCodalynAttrSyncResult,
  gate: TagSyncEnteredGate
): Promise<void> {
  await exitUntilPageForInstanceEnter();
  try {
    await webflow.enterComponent(instance);
  } catch (e) {
    debugTagAttrsErr("enterComponent failed", e);
    throw e;
  }
  gate.entered = true;

  const root = await comp.getRootElement();
  if (root) {
    const diag: PropTagWalkDiag | undefined =
      exposedIds.size > 0 ? { eligibleNodesChecked: 0, designerBoundPropIds: new Set<string>() } : undefined;
    await walkTree(root, exposedIds, new Map(), out, diag, 0);
    if (diag != null) {
      logDiagWhenNothingTagged(diag, out, exposedIds);
    }
  }
  out.variantsWalked = 1;
}

/**
 * Tags `data-codalyn-beacon-prop` on elements bound to exposed instance props. Enters nested component definitions
 * only when `getProps()` shows their props are wired to an exposed parent prop; inner bindings use nested prop ids
 * and are written with the canonical exposed id the runtime expects.
 */
export function syncEngineCodalynSlotPropAttributes(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[]
): Promise<EngineCodalynAttrSyncResult> {
  return runExclusiveDesignerStyleOp(async () => {
    const exposedIds = new Set(exposed.map((e) => e.propId));
    const out: EngineCodalynAttrSyncResult = { tagged: 0, removed: 0, variantsWalked: 0, errors: [] };
    const comp = await instance.getComponent();
    const gate: TagSyncEnteredGate = { entered: false };
    try {
      await enterComponentDefinitionsAndWalk(instance, comp, exposedIds, out, gate);
    } catch (e) {
      debugTagAttrsErr("sync aborted", e);
      throw e;
    } finally {
      if (gate.entered) {
        await webflow.exitComponent().catch(() => undefined);
      }
    }
    return out;
  });
}
