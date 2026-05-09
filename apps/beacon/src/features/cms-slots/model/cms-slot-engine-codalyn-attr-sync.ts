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
  /** Elements that had the attribute set or updated */
  tagged: number;
  /** Elements that had our attribute removed (left expose list) */
  removed: number;
  /** Passes over component variant trees (always 1: current canvas variant only) */
  variantsWalked: number;
  errors: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Webflow `getSettings()` values are usually setting rows: `{ valueType?, value: { sourceType, propId } }`.
 * Some responses use a flat `{ sourceType: "prop", propId }` — accept both (mirrors image-editor binding reads).
 */
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

function hasCustomAttributes(el: AnyElement): boolean {
  return "customAttributes" in el && (el as { customAttributes?: boolean }).customAttributes === true;
}

type CustomAttrOps = {
  getCustomAttribute: (n: string) => Promise<null | string>;
  setCustomAttribute: (n: string, v: string) => Promise<null>;
  removeCustomAttribute: (n: string) => Promise<null>;
};

type SettingsOps = {
  getSettings: () => Promise<Record<string, unknown>>;
};

function asCustomAttrEl(el: AnyElement): CustomAttrOps {
  return el as AnyElement as CustomAttrOps;
}

function asSettingsEl(el: AnyElement): SettingsOps {
  return el as AnyElement as SettingsOps;
}

async function stripStaleCodalynAttr(
  ael: CustomAttrOps,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">
): Promise<void> {
  try {
    const existing = await ael.getCustomAttribute(ATTR);
    if (existing != null && existing.length > 0 && !attrValueStillWanted(existing, exposedIds)) {
      await ael.removeCustomAttribute(ATTR);
      out.removed += 1;
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
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

function collectExposedPropIdsFromSettings(
  settings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>
): string[] {
  const fromExpose: string[] = [];
  for (const v of Object.values(settings)) {
    const pid = bindingPropIdFromSettingValue(v);
    if (pid != null && exposedIds.has(pid)) {
      fromExpose.push(pid);
    }
  }
  return fromExpose;
}

/** When set, records how many eligible elements we saw and every `propId` from `sourceType: prop` bindings on them. */
export type PropTagWalkDiag = {
  eligibleNodesChecked: number;
  designerBoundPropIds: Set<string>;
};

async function applyCodalynAttrForBindings(
  ael: CustomAttrOps,
  sel: SettingsOps,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  diag?: PropTagWalkDiag
): Promise<void> {
  try {
    const settings = await sel.getSettings();
    if (diag != null) {
      diag.eligibleNodesChecked += 1;
      for (const pid of collectAllPropBindingPropIds(settings)) {
        diag.designerBoundPropIds.add(pid);
      }
    }
    const fromExpose = collectExposedPropIdsFromSettings(settings, exposedIds);
    const uniq = [...new Set(fromExpose)].sort();
    if (uniq.length === 0) {
      return;
    }
    const nextVal = uniq.join("|");
    const cur = await ael.getCustomAttribute(ATTR);
    if (cur !== nextVal) {
      await ael.setCustomAttribute(ATTR, nextVal);
      out.tagged += 1;
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function walk(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  diag?: PropTagWalkDiag
): Promise<void> {
  const canAttr = hasCustomAttributes(el);
  const canSettings = hasElementSettings(el);
  if (canAttr) {
    await stripStaleCodalynAttr(asCustomAttrEl(el), exposedIds, out);
  }
  if (canSettings && canAttr) {
    await applyCodalynAttrForBindings(asCustomAttrEl(el), asSettingsEl(el), exposedIds, out, diag);
  }
  if (hasChildren(el)) {
    const kids = await el.getChildren();
    for (const ch of kids) {
      await walk(ch, exposedIds, out, diag);
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
      ? "no tags: no elements combined component prop bindings + Custom attributes API on this variant"
      : overlap.length === 0
        ? "no tags: Expose IDs do not match any prop binding on eligible elements — link elements to props in Component"
        : "no writes: overlaps exist but ATTR unchanged (already synced?) — check idsInExposeAndOnBindings";
  debugTagAttrsLog(stage, {
    eligibleNodesHadSettingsAndCustomAttrs: diag.eligibleNodesChecked,
    designerBoundPropIds: [...diag.designerBoundPropIds].sort(),
    exposedPropIds: [...exposedIds].sort(),
    idsInExposeAndOnBindings: overlap,
  });
}

type TagSyncEnteredGate = { entered: boolean };

/**
 * Leaves nested components, enters `instance`, walks prop tags, sets `gate.entered` only after successful `enterComponent`.
 */
async function enterComponentDefinitionsAndWalk(
  instance: ComponentElement,
  comp: Component,
  exposedIds: Set<string>,
  out: EngineCodalynAttrSyncResult,
  gate: TagSyncEnteredGate
): Promise<void> {
  debugTagAttrsLog("exit nested scopes (prep for enterComponent)");
  await exitUntilPageForInstanceEnter();

  debugTagAttrsLog("enterComponent(instance)");
  try {
    await webflow.enterComponent(instance);
  } catch (e) {
    debugTagAttrsErr("enterComponent failed", e);
    throw e;
  }
  gate.entered = true;

  const root = await comp.getRootElement();
  debugTagAttrsLog("getRootElement", {
    rootElementType: root?.type ?? null,
    missingRoot: root == null,
  });

  if (root) {
    const diag: PropTagWalkDiag | undefined =
      exposedIds.size > 0 ? { eligibleNodesChecked: 0, designerBoundPropIds: new Set<string>() } : undefined;
    await walk(root, exposedIds, out, diag);
    if (diag != null) {
      logDiagWhenNothingTagged(diag, out, exposedIds);
    }
  } else {
    debugTagAttrsLog("skipped walk: no root element for current variant");
  }
  out.variantsWalked = 1;
  debugTagAttrsLog("walk done", {
    tagged: out.tagged,
    removed: out.removed,
    walkErrors: out.errors.slice(),
  });
}

/**
 * For the **component definition** of `instance`, walks the in-component DOM and:
 * - sets `data-codalyn-beacon-prop` on any element that has a **property binding** to an id in `exposed` (pipe-joins
 *   multiple); required for the published footer runtime to find targets.
 * - removes that attribute if it was set but the prop is no longer exposed.
 *
 * Only the **currently selected component variant** is walked (no variant switching). If bindings live only in
 * another variant, open that variant in the component editor and run sync again.
 */
export function syncEngineCodalynSlotPropAttributes(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[]
): Promise<EngineCodalynAttrSyncResult> {
  return runExclusiveDesignerStyleOp(async () => {
    const exposedIds = new Set(exposed.map((e) => e.propId));
    const out: EngineCodalynAttrSyncResult = { tagged: 0, removed: 0, variantsWalked: 0, errors: [] };
    const comp = await instance.getComponent();
    let compName: string | undefined;
    try {
      compName = await comp.getName();
    } catch (e) {
      debugTagAttrsErr("getComponent().getName failed (non-fatal)", e);
    }
    debugTagAttrsLog("sync start", {
      definitionComponentId: comp.id,
      definitionName: compName,
      exposedPropIds: [...exposedIds],
    });

    const gate: TagSyncEnteredGate = { entered: false };
    try {
      await enterComponentDefinitionsAndWalk(instance, comp, exposedIds, out, gate);
    } catch (e) {
      debugTagAttrsErr("sync aborted (rethrow)", e);
      throw e;
    } finally {
      if (gate.entered) {
        debugTagAttrsLog("exitComponent");
        await webflow.exitComponent().catch((e) => {
          debugTagAttrsErr("exitComponent failed (ignored)", e);
        });
      }
    }
    return out;
  });
}
