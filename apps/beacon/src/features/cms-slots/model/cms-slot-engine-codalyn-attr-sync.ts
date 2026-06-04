import {
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
  contentAttrSegmentOwnedBy,
  formatContentAttrSegmentsForBindings,
  mergeContentAttrSegments,
  removeCmsSlotTagAttrsIfPresent,
  removeOwnedCmsSlotTagAttrs,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  classifyElementBindings,
  type ElementBindingClassification,
  isConditionalVisibilityValue,
} from "@/features/cms-slots/model/cms-slot-engine-element-bindings";
import { seedConditionalControllerPlaceholders } from "@/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders";
import {
  bindingPropIdFromSettingValue,
  canonicalExposedPropId,
  nestedAliasForComponentInstance,
} from "@/features/cms-slots/model/cms-slot-nested-prop-alias";
import {
  CMS_SLOTS_ROUTE_TASK_ENTERING_COMPONENT,
  CMS_SLOTS_ROUTE_TASK_TAGGING_ELEMENTS,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  exitUntilPageForComponentEnter,
  MAX_DESIGNER_COMPONENT_NESTING,
  withComponentDefinitionScope,
} from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

export type EngineCodalynAttrSyncResult = {
  tagged: number;
  removed: number;
  /**
   * Distinct exposed prop ids that have at least one bound element in the definition — i.e. how many fields are
   * actually wired up, regardless of whether their attrs changed this run. Lets callers tell "already up to date"
   * (`matchedPropCount > 0`, nothing changed) apart from "nothing is wired" (`matchedPropCount === 0`).
   */
  matchedPropCount: number;
  variantsWalked: number;
  /** Conditional controller props seeded so Webflow conditional visibility includes tagged nodes at publish. */
  publishPlaceholdersSeeded: number;
  errors: string[];
};

export type EngineCodalynAttrStripResult = {
  removed: number;
  errors: string[];
};

/** Accumulated walk output: exposed content props tagged, and controller props that need a publish seed. */
export type EngineTagWalkResult = {
  taggedPropIds: Set<string>;
  /** Prop ids (on the placed instance) to seed truthy so conditionally visible nodes survive publish. */
  conditionalControllerPropIds: Set<string>;
};

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
  return canonicalExposedPropId(boundPropId, exposedIds, nestedAlias);
}

function collectExposedContentPropIds(
  contentSettings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>
): string[] {
  const ids: string[] = [];
  for (const v of Object.values(contentSettings)) {
    const pid = bindingPropIdFromSettingValue(v);
    if (pid == null) {
      continue;
    }
    const canonical = canonicalExposedId(pid, exposedIds, nestedAlias);
    if (canonical != null) {
      ids.push(canonical);
    }
  }
  return ids;
}

/**
 * Resolves the prop id (on the **placed instance**) to seed so a conditionally-visible element survives publish.
 * Root-depth bindings seed their own prop; nested bindings seed the canonical parent prop they are wired to.
 */
function seedablePropIdForController(
  controllerPropId: string,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  nestedDepth: number
): string | null {
  if (nestedDepth <= 0) {
    return controllerPropId;
  }
  const canonical = canonicalExposedId(controllerPropId, exposedIds, nestedAlias);
  if (canonical != null) {
    return canonical;
  }
  return nestedAlias.get(controllerPropId) ?? null;
}

type WalkAcc = {
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">;
  taggedPropIds: Set<string>;
  contentBindingCounts: Map<string, number>;
  conditionalControllerPropIds: Set<string>;
  /** Exposed prop ids of the **other** Engine components in this list; their `data-cb-c` segments are preserved. */
  foreignExposedIds: ReadonlySet<string>;
};

async function setOrClearAttr(attr: PropAttrOps, name: string, value: string | null): Promise<boolean> {
  const cur = await attr.get(name);
  if (value == null) {
    if (cur != null && cur.length > 0) {
      await attr.remove(name);
      return true;
    }
    return false;
  }
  if (cur !== value) {
    await attr.set(name, value);
    return true;
  }
  return false;
}

/**
 * `data-cb-v` target for a shared element: `"1"` when the current component binds it conditionally; otherwise keep
 * the existing flag while another Engine component still owns a segment here (that component may rely on it); else clear.
 */
async function resolveConditionalTarget(
  attr: PropAttrOps,
  conditional: boolean,
  mergedSegments: readonly string[],
  foreignExposedIds: ReadonlySet<string>
): Promise<string | null> {
  if (conditional) {
    return "1";
  }
  const foreignRemains = mergedSegments.some((seg) => contentAttrSegmentOwnedBy(seg, foreignExposedIds));
  if (!foreignRemains) {
    return null;
  }
  const prev = await attr.get(CMS_SLOT_COND_ATTR);
  return prev != null && prev.length > 0 ? "1" : null;
}

/** This component's content prop ids + conditional flag for one element; records its conditional controller seed. */
function deriveOwnedBindingForElement(
  classification: ElementBindingClassification | null,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): { contentIds: string[]; conditional: boolean } {
  if (classification == null) {
    return { contentIds: [], conditional: false };
  }
  const contentIds = [...new Set(collectExposedContentPropIds(classification.content, exposedIds, nestedAlias))].sort();
  const conditional = isConditionalVisibilityValue(classification.visibility);
  const controllerPropId = bindingPropIdFromSettingValue(classification.visibility);
  if (conditional && controllerPropId != null) {
    const seedable = seedablePropIdForController(controllerPropId, exposedIds, nestedAlias, nestedDepth);
    if (seedable != null) {
      acc.conditionalControllerPropIds.add(seedable);
    }
  }
  return { contentIds, conditional };
}

/** Writes the merged `data-cb-c` and its companion `data-cb-v`; counts a tag when anything changed. */
async function writeMergedTagAttrs(
  attr: PropAttrOps,
  merged: readonly string[],
  conditional: boolean,
  acc: WalkAcc
): Promise<void> {
  const contentChanged = await setOrClearAttr(attr, CMS_SLOT_CONTENT_ATTR, merged.join("|"));
  const condTarget = await resolveConditionalTarget(attr, conditional, merged, acc.foreignExposedIds);
  const condChanged = await setOrClearAttr(attr, CMS_SLOT_COND_ATTR, condTarget);
  if (contentChanged || condChanged) {
    acc.out.tagged += 1;
  }
}

/**
 * Writes this component's tags onto one element while preserving other Engine components' segments. `data-cb-c`
 * becomes the merge of foreign-owned segments and this sync's new segments; `data-cb-v` (conditional) is kept while
 * any segment remains, and cleared (along with `data-cb-c`) when none do.
 */
async function applyMergedCmsSlotAttrsForElement(
  attr: PropAttrOps,
  classification: ElementBindingClassification | null,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  try {
    const { contentIds, conditional } = deriveOwnedBindingForElement(
      classification,
      exposedIds,
      nestedAlias,
      acc,
      nestedDepth
    );
    const newSegments =
      contentIds.length > 0 ? formatContentAttrSegmentsForBindings(contentIds, acc.contentBindingCounts) : [];
    const merged = mergeContentAttrSegments({
      existing: await attr.get(CMS_SLOT_CONTENT_ATTR),
      foreignExposedIds: acc.foreignExposedIds,
      newSegments,
    });

    if (merged.length === 0) {
      // An empty merge means no foreign-owned segment survived and this sync added none, so nothing on this
      // element should stay tagged. Strip every Engine tag (covers a just-deselected prop whose stale segment is
      // no longer in `exposedIds`); ownership-scoped removal would wrongly preserve that orphaned segment.
      acc.out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
      return;
    }
    if (newSegments.length > 0) {
      for (const pid of contentIds) {
        acc.taggedPropIds.add(pid);
      }
    }
    await writeMergedTagAttrs(attr, merged, conditional, acc);
  } catch (e) {
    acc.out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionIfLinked(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  if (nestedDepth > MAX_DESIGNER_COMPONENT_NESTING) {
    return;
  }
  const link = await nestedAliasForComponentInstance(inst, exposedIds, upstreamAlias);
  if (link.size === 0) {
    return;
  }
  const merged = new Map(upstreamAlias);
  for (const [k, v] of link) {
    merged.set(k, v);
  }
  try {
    await webflow.enterComponent(inst);
  } catch (e) {
    acc.out.errors.push(String(e instanceof Error ? e.message : e));
    return;
  }
  try {
    const root = await (await inst.getComponent()).getRootElement();
    if (root) {
      await walkTree(root, exposedIds, merged, acc, nestedDepth + 1);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function syncElementCmsSlotAttr(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr == null) {
    return;
  }
  const classification = await classifyElementBindings(el);
  await applyMergedCmsSlotAttrsForElement(attr, classification, exposedIds, nestedAlias, acc, nestedDepth);
}

async function walkTree(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  await syncElementCmsSlotAttr(el, exposedIds, nestedAlias, acc, nestedDepth);
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await walkTree(ch, exposedIds, nestedAlias, acc, nestedDepth);
      }
    }
    await enterNestedDefinitionIfLinked(inst, exposedIds, nestedAlias, acc, nestedDepth);
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await walkTree(ch, exposedIds, nestedAlias, acc, nestedDepth);
    }
  }
}

type TagSyncEnteredGate = { entered: boolean };

async function enterComponentDefinitionsAndWalk(
  instance: ComponentElement,
  comp: Component,
  exposed: readonly ComposableInstancePropMeta[],
  foreignExposedIds: ReadonlySet<string>,
  out: EngineCodalynAttrSyncResult,
  gate: TagSyncEnteredGate,
  onProgress?: (message: string) => void
): Promise<EngineTagWalkResult> {
  const exposedIds = new Set(exposed.map((e) => e.propId));
  const acc: WalkAcc = {
    out,
    taggedPropIds: new Set<string>(),
    contentBindingCounts: new Map<string, number>(),
    conditionalControllerPropIds: new Set<string>(),
    foreignExposedIds,
  };
  await exitUntilPageForComponentEnter();
  onProgress?.(CMS_SLOTS_ROUTE_TASK_ENTERING_COMPONENT);
  await webflow.enterComponent(instance);
  gate.entered = true;
  onProgress?.(CMS_SLOTS_ROUTE_TASK_TAGGING_ELEMENTS);

  const root = await comp.getRootElement();
  if (root) {
    await walkTree(root, exposedIds, new Map(), acc, 0);
  }
  out.variantsWalked = 1;
  return {
    taggedPropIds: acc.taggedPropIds,
    conditionalControllerPropIds: acc.conditionalControllerPropIds,
  };
}

async function stripElementCmsSlotAttrs(
  el: AnyElement,
  out: EngineCodalynAttrStripResult,
  ownerExposedIds: ReadonlySet<string>
): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr == null) {
    return;
  }
  try {
    out.removed += await removeOwnedCmsSlotTagAttrs(attr, ownerExposedIds);
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionAndStripCmsSlotAttrs(
  inst: ComponentElement,
  out: EngineCodalynAttrStripResult,
  nestedDepth: number,
  ownerExposedIds: ReadonlySet<string>
): Promise<void> {
  if (nestedDepth > MAX_DESIGNER_COMPONENT_NESTING) {
    return;
  }
  try {
    await webflow.enterComponent(inst);
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
    return;
  }
  try {
    const root = await (await inst.getComponent()).getRootElement();
    if (root != null) {
      await stripTreeCmsSlotAttrs(root, out, nestedDepth + 1, ownerExposedIds);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function stripTreeCmsSlotAttrs(
  el: AnyElement,
  out: EngineCodalynAttrStripResult,
  nestedDepth: number,
  ownerExposedIds: ReadonlySet<string>
): Promise<void> {
  await stripElementCmsSlotAttrs(el, out, ownerExposedIds);
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await stripTreeCmsSlotAttrs(ch, out, nestedDepth, ownerExposedIds);
      }
    }
    await enterNestedDefinitionAndStripCmsSlotAttrs(inst, out, nestedDepth, ownerExposedIds);
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await stripTreeCmsSlotAttrs(ch, out, nestedDepth, ownerExposedIds);
    }
  }
}

/**
 * Removes CMS slot tag attributes from a component definition before the hidden-list instance is deleted so the
 * site component is not left with stale CMS slot attrs.
 *
 * Pass `ownerExposedIds` (the deleted component's exposed prop ids) so a **shared** nested definition keeps the
 * `data-cb-c` segments owned by other Engine components (e.g. an Image used by both Hero and Card): only this
 * component's segments are removed, and the element's tags are cleared only when no segment remains. Omit / empty
 * set ⇒ remove all tags (single-owner / legacy callers).
 */
export function stripEngineCodalynAttrsFromComponentInstance(
  instance: ComponentElement,
  ownerExposedIds: ReadonlySet<string> = new Set()
): Promise<EngineCodalynAttrStripResult> {
  return withComponentDefinitionScope(
    instance,
    async ({ definitionRoot }) => {
      const out: EngineCodalynAttrStripResult = { removed: 0, errors: [] };
      if (definitionRoot != null) {
        await stripTreeCmsSlotAttrs(definitionRoot, out, 0, ownerExposedIds);
      }
      return out;
    },
    {
      onEnterFailed: () => ({ removed: 0, errors: ["Could not open this component for attribute cleanup."] }),
    }
  );
}

/**
 * Tags `data-cb-c` (content prop ids) and `data-cb-v` (conditional flag) on elements bound to exposed instance
 * props. Duplicate bindings to the same exposed prop use an ordinal suffix `propId@N` on later sites. Enters nested
 * component definitions only when `getProps()` shows their props are wired to an exposed parent prop. Seeds publish
 * placeholders on every conditional element's controller prop so conditionally visible nodes survive publish.
 *
 * `foreignExposedIds` are the exposed prop ids of the **other** Engine components that may share a definition with
 * this one — both the other components in this list and the components in other CMS slots on the page. When a nested
 * component definition is shared across multiple Engine components (e.g. an Image used by both Hero and Card, or by
 * slots on two different lists), their `data-cb-c` segments are preserved so each row resolves its own prop at
 * runtime instead of last-write-wins.
 */
export function syncEngineCodalynSlotPropAttributes(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[],
  foreignExposedIds: ReadonlySet<string> = new Set(),
  onProgress?: (message: string) => void
): Promise<EngineCodalynAttrSyncResult> {
  return runExclusiveDesignerOp(async () => {
    const out: EngineCodalynAttrSyncResult = {
      tagged: 0,
      removed: 0,
      matchedPropCount: 0,
      variantsWalked: 0,
      publishPlaceholdersSeeded: 0,
      errors: [],
    };
    const comp = await instance.getComponent();
    const gate: TagSyncEnteredGate = { entered: false };
    let conditionalControllerPropIds = new Set<string>();
    let taggedPropIds = new Set<string>();
    try {
      ({ conditionalControllerPropIds, taggedPropIds } = await enterComponentDefinitionsAndWalk(
        instance,
        comp,
        exposed,
        foreignExposedIds,
        out,
        gate,
        onProgress
      ));
    } finally {
      if (gate.entered) {
        await webflow.exitComponent().catch(() => undefined);
      }
    }
    out.matchedPropCount = taggedPropIds.size;
    try {
      out.publishPlaceholdersSeeded = await seedConditionalControllerPlaceholders(
        instance,
        conditionalControllerPropIds
      );
    } catch (e) {
      out.errors.push(String(e instanceof Error ? e.message : e));
    }
    return out;
  });
}
