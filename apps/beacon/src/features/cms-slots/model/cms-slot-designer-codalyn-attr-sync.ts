import {
  CMS_SLOT_CLASS_ATTR,
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
  classAttributeBoundPropIds,
  classifyElementBindings,
  type ElementBindingClassification,
  isConditionalVisibilityValue,
} from "@/features/cms-slots/model/cms-slot-designer-element-bindings";
import { seedConditionalControllerPlaceholders } from "@/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders";
import {
  bindingPropIdFromSettingValue,
  canonicalExposedPropId,
  hasParentPropWiring,
  mapNestedPropsToExposedIds,
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

export type DesignerCodalynAttrSyncResult = {
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

export type DesignerCodalynAttrStripResult = {
  removed: number;
  errors: string[];
};

/** Accumulated walk output: exposed content props tagged, and controller props that need a publish seed. */
export type DesignerTagWalkResult = {
  taggedPropIds: Set<string>;
  /** Prop ids (on the placed instance) to seed truthy so conditionally visible nodes survive publish. */
  conditionalControllerPropIds: Set<string>;
};

function hasChildren(el: AnyElement): el is AnyElement & { getChildren: () => Promise<AnyElement[]> } {
  return "children" in el && (el as { children?: boolean }).children === true;
}

/**
 * Slot content for a component instance. `SlotInstanceElement` (from `getSlots()`) always exposes `getChildren()` and
 * carries no `children` discriminant, so the {@link hasChildren} guard used for `AnyElement` does not apply to it —
 * gating slots on `hasChildren` skipped every slot, leaving slot-nested elements untagged.
 */
async function slotChildren(slot: SlotInstanceElement): Promise<AnyElement[]> {
  return slot.getChildren().catch(() => [] as AnyElement[]);
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

/** Exposed prop ids bound to the element's `class` attribute (Webflow Attributes panel → runtime class append). */
function collectExposedClassPropIds(
  contentSettings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>
): string[] {
  const ids: string[] = [];
  for (const pid of classAttributeBoundPropIds(contentSettings)) {
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
  out: Pick<DesignerCodalynAttrSyncResult, "tagged" | "removed" | "errors">;
  taggedPropIds: Set<string>;
  contentBindingCounts: Map<string, number>;
  /** Per-prop ordinal counter for `data-cb-cls` segments, kept separate from content so class `@N` ids are independent. */
  classBindingCounts: Map<string, number>;
  conditionalControllerPropIds: Set<string>;
  /** Exposed prop ids of the **other** Designer components in this list; their `data-cb-c` segments are preserved. */
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
 * the existing flag while another Designer component still owns a segment here (that component may rely on it); else clear.
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

/** This component's content + class prop ids + conditional flag for one element; records its conditional controller seed. */
function deriveOwnedBindingForElement(
  classification: ElementBindingClassification | null,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): { contentIds: string[]; classIds: string[]; conditional: boolean } {
  if (classification == null) {
    return { contentIds: [], classIds: [], conditional: false };
  }
  const contentIds = [...new Set(collectExposedContentPropIds(classification.content, exposedIds, nestedAlias))].sort();
  const classIds = [...new Set(collectExposedClassPropIds(classification.content, exposedIds, nestedAlias))].sort();
  const conditional = isConditionalVisibilityValue(classification.visibility);
  const controllerPropId = bindingPropIdFromSettingValue(classification.visibility);
  if (conditional && controllerPropId != null) {
    const seedable = seedablePropIdForController(controllerPropId, exposedIds, nestedAlias, nestedDepth);
    if (seedable != null) {
      acc.conditionalControllerPropIds.add(seedable);
    }
  }
  return { contentIds, classIds, conditional };
}

/** Writes the merged `data-cb-c`, its companion `data-cb-v`, and `data-cb-cls`; counts a tag when anything changed. */
async function writeMergedTagAttrs(
  attr: PropAttrOps,
  contentMerged: readonly string[],
  classMerged: readonly string[],
  conditional: boolean,
  acc: WalkAcc
): Promise<void> {
  const contentChanged = await setOrClearAttr(
    attr,
    CMS_SLOT_CONTENT_ATTR,
    contentMerged.length > 0 ? contentMerged.join("|") : null
  );
  const condTarget = await resolveConditionalTarget(attr, conditional, contentMerged, acc.foreignExposedIds);
  const condChanged = await setOrClearAttr(attr, CMS_SLOT_COND_ATTR, condTarget);
  const classChanged = await setOrClearAttr(
    attr,
    CMS_SLOT_CLASS_ATTR,
    classMerged.length > 0 ? classMerged.join("|") : null
  );
  if (contentChanged || condChanged || classChanged) {
    acc.out.tagged += 1;
  }
}

/**
 * Writes this component's tags onto one element while preserving other Designer components' segments. `data-cb-c`
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
    const { contentIds, classIds, conditional } = deriveOwnedBindingForElement(
      classification,
      exposedIds,
      nestedAlias,
      acc,
      nestedDepth
    );
    const newSegments =
      contentIds.length > 0 ? formatContentAttrSegmentsForBindings(contentIds, acc.contentBindingCounts) : [];
    const contentMerged = mergeContentAttrSegments({
      existing: await attr.get(CMS_SLOT_CONTENT_ATTR),
      foreignExposedIds: acc.foreignExposedIds,
      newSegments,
    });

    const newClassSegments =
      classIds.length > 0 ? formatContentAttrSegmentsForBindings(classIds, acc.classBindingCounts) : [];
    const classMerged = mergeContentAttrSegments({
      existing: await attr.get(CMS_SLOT_CLASS_ATTR),
      foreignExposedIds: acc.foreignExposedIds,
      newSegments: newClassSegments,
    });

    if (contentMerged.length === 0 && classMerged.length === 0) {
      // An empty merge on both streams means no foreign-owned segment survived and this sync added none, so nothing
      // on this element should stay tagged. Strip every Designer tag (covers a just-deselected prop whose stale
      // segment is no longer in `exposedIds`); ownership-scoped removal would wrongly preserve that orphaned segment.
      acc.out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
      return;
    }
    if (newSegments.length > 0) {
      for (const pid of contentIds) {
        acc.taggedPropIds.add(pid);
      }
    }
    if (newClassSegments.length > 0) {
      for (const pid of classIds) {
        acc.taggedPropIds.add(pid);
      }
    }
    await writeMergedTagAttrs(attr, contentMerged, classMerged, conditional, acc);
  } catch (e) {
    acc.out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionIfWired(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  if (nestedDepth > MAX_DESIGNER_COMPONENT_NESTING) {
    return;
  }
  const props = await inst.getProps().catch(() => [] as InstancePropSummary[]);
  // Descend whenever the instance is wired to a parent prop — not only when that prop is *currently* exposed.
  // The wiring outlives a deselect, so a definition tagged on an earlier run still holds the orphaned segment;
  // re-entering it is the only way to strip that tag, because the root-level strip-on-empty-merge never reaches
  // an element behind an unlinked instance. Foreign-owned segments are still preserved by the per-element merge,
  // so this stays multi-slot safe.
  if (!hasParentPropWiring(props)) {
    return;
  }
  const link = mapNestedPropsToExposedIds(props, exposedIds, upstreamAlias);
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
      for (const ch of await slotChildren(slot)) {
        await walkTree(ch, exposedIds, nestedAlias, acc, nestedDepth);
      }
    }
    await enterNestedDefinitionIfWired(inst, exposedIds, nestedAlias, acc, nestedDepth);
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
  out: DesignerCodalynAttrSyncResult,
  gate: TagSyncEnteredGate,
  onProgress?: (message: string) => void
): Promise<DesignerTagWalkResult> {
  const exposedIds = new Set(exposed.map((e) => e.propId));
  const acc: WalkAcc = {
    out,
    taggedPropIds: new Set<string>(),
    contentBindingCounts: new Map<string, number>(),
    classBindingCounts: new Map<string, number>(),
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
  out: DesignerCodalynAttrStripResult,
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
  out: DesignerCodalynAttrStripResult,
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
  out: DesignerCodalynAttrStripResult,
  nestedDepth: number,
  ownerExposedIds: ReadonlySet<string>
): Promise<void> {
  await stripElementCmsSlotAttrs(el, out, ownerExposedIds);
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      for (const ch of await slotChildren(slot)) {
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
 * `data-cb-c` segments owned by other Designer components (e.g. an Image used by both Hero and Card): only this
 * component's segments are removed, and the element's tags are cleared only when no segment remains. Omit / empty
 * set ⇒ remove all tags (single-owner / legacy callers).
 */
export function stripDesignerCodalynAttrsFromComponentInstance(
  instance: ComponentElement,
  ownerExposedIds: ReadonlySet<string> = new Set()
): Promise<DesignerCodalynAttrStripResult> {
  return withComponentDefinitionScope(
    instance,
    async ({ definitionRoot }) => {
      const out: DesignerCodalynAttrStripResult = { removed: 0, errors: [] };
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
 * `foreignExposedIds` are the exposed prop ids of the **other** Designer components that may share a definition with
 * this one — both the other components in this list and the components in other CMS slots on the page. When a nested
 * component definition is shared across multiple Designer components (e.g. an Image used by both Hero and Card, or by
 * slots on two different lists), their `data-cb-c` segments are preserved so each row resolves its own prop at
 * runtime instead of last-write-wins.
 */
export function syncDesignerCodalynSlotPropAttributes(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[],
  foreignExposedIds: ReadonlySet<string> = new Set(),
  onProgress?: (message: string) => void
): Promise<DesignerCodalynAttrSyncResult> {
  return runExclusiveDesignerOp(async () => {
    const out: DesignerCodalynAttrSyncResult = {
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
