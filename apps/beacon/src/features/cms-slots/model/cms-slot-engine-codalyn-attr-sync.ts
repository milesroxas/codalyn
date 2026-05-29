import {
  CMS_SLOT_BIND_ATTR,
  CMS_SLOT_COND_ATTR,
  CMS_SLOT_CONTENT_ATTR,
  canonicalPropIdFromContentAttrSegment,
  cmsSlotBeaconBindIdFromElement,
  formatContentAttrSegmentsForBindings,
  removeCmsSlotTagAttrsIfPresent,
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

export { mapNestedPropsToExposedIds } from "@/features/cms-slots/model/cms-slot-nested-prop-alias";

function attrValueStillWanted(value: string, exposedIds: ReadonlySet<string>): boolean {
  const lowerExposed = new Set([...exposedIds].map((id) => id.toLowerCase()));
  for (const part of value.split("|")) {
    const canonical = canonicalPropIdFromContentAttrSegment(part);
    if (canonical.length > 0 && (exposedIds.has(canonical) || lowerExposed.has(canonical.toLowerCase()))) {
      return true;
    }
  }
  return false;
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
};

async function stripStaleContentAttr(
  attr: PropAttrOps,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">
): Promise<void> {
  try {
    const existing = await attr.get(CMS_SLOT_CONTENT_ATTR);
    if (existing != null && existing.length > 0 && !attrValueStillWanted(existing, exposedIds)) {
      await attr.remove(CMS_SLOT_CONTENT_ATTR);
      out.removed += 1;
    }
    const bind = await attr.get(CMS_SLOT_BIND_ATTR);
    if (bind != null && bind.length > 0) {
      const content = await attr.get(CMS_SLOT_CONTENT_ATTR);
      if (content == null || content.length === 0) {
        await attr.remove(CMS_SLOT_BIND_ATTR);
        out.removed += 1;
      }
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

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

async function applyCmsSlotAttrsForElement(
  attr: PropAttrOps,
  bindId: string,
  classification: ElementBindingClassification,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  acc: WalkAcc,
  nestedDepth: number
): Promise<void> {
  try {
    const contentIds = [
      ...new Set(collectExposedContentPropIds(classification.content, exposedIds, nestedAlias)),
    ].sort();
    const conditional = isConditionalVisibilityValue(classification.visibility);
    const controllerPropId = bindingPropIdFromSettingValue(classification.visibility);

    if (conditional && controllerPropId != null) {
      const seedable = seedablePropIdForController(controllerPropId, exposedIds, nestedAlias, nestedDepth);
      if (seedable != null) {
        acc.conditionalControllerPropIds.add(seedable);
      }
    }

    if (contentIds.length === 0) {
      acc.out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
      return;
    }

    for (const pid of contentIds) {
      acc.taggedPropIds.add(pid);
    }
    const segments = formatContentAttrSegmentsForBindings(contentIds, bindId, acc.contentBindingCounts);
    if (await setOrClearAttr(attr, CMS_SLOT_CONTENT_ATTR, segments.join("|"))) {
      acc.out.tagged += 1;
    }
    if (await setOrClearAttr(attr, CMS_SLOT_BIND_ATTR, bindId)) {
      acc.out.tagged += 1;
    }
    if (await setOrClearAttr(attr, CMS_SLOT_COND_ATTR, conditional ? "1" : null)) {
      acc.out.tagged += 1;
    }
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
  await stripStaleContentAttr(attr, exposedIds, acc.out);
  const classification = await classifyElementBindings(el);
  if (classification == null) {
    acc.out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
    return;
  }
  const bindId = cmsSlotBeaconBindIdFromElement(el);
  if (bindId == null) {
    acc.out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
    return;
  }
  await applyCmsSlotAttrsForElement(attr, bindId, classification, exposedIds, nestedAlias, acc, nestedDepth);
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

async function stripElementCmsSlotAttrs(el: AnyElement, out: EngineCodalynAttrStripResult): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr == null) {
    return;
  }
  try {
    out.removed += await removeCmsSlotTagAttrsIfPresent(attr);
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionAndStripCmsSlotAttrs(
  inst: ComponentElement,
  out: EngineCodalynAttrStripResult,
  nestedDepth: number
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
      await stripTreeCmsSlotAttrs(root, out, nestedDepth + 1);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function stripTreeCmsSlotAttrs(
  el: AnyElement,
  out: EngineCodalynAttrStripResult,
  nestedDepth: number
): Promise<void> {
  await stripElementCmsSlotAttrs(el, out);
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await stripTreeCmsSlotAttrs(ch, out, nestedDepth);
      }
    }
    await enterNestedDefinitionAndStripCmsSlotAttrs(inst, out, nestedDepth);
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await stripTreeCmsSlotAttrs(ch, out, nestedDepth);
    }
  }
}

/**
 * Removes CMS slot tag attributes from a component definition before the hidden-list instance is deleted so the
 * site component is not left with stale CMS slot attrs.
 */
export function stripEngineCodalynAttrsFromComponentInstance(
  instance: ComponentElement
): Promise<EngineCodalynAttrStripResult> {
  return withComponentDefinitionScope(
    instance,
    async ({ definitionRoot }) => {
      const out: EngineCodalynAttrStripResult = { removed: 0, errors: [] };
      if (definitionRoot != null) {
        await stripTreeCmsSlotAttrs(definitionRoot, out, 0);
      }
      return out;
    },
    {
      onEnterFailed: () => ({ removed: 0, errors: ["Could not open this component for attribute cleanup."] }),
    }
  );
}

/**
 * Tags `data-cb-c` (content prop ids), `data-cb-id` (bind id), and `data-cb-v` (conditional flag) on elements bound
 * to exposed instance props. Each tagged node gets a unique bind id; duplicate bindings to the same exposed prop use
 * `propId@bindId` on later sites. Enters nested component definitions only when `getProps()` shows their props are
 * wired to an exposed parent prop. Seeds publish placeholders on every conditional element's controller prop so
 * conditionally visible nodes survive publish.
 */
export function syncEngineCodalynSlotPropAttributes(
  instance: ComponentElement,
  exposed: readonly ComposableInstancePropMeta[],
  onProgress?: (message: string) => void
): Promise<EngineCodalynAttrSyncResult> {
  return runExclusiveDesignerOp(async () => {
    const out: EngineCodalynAttrSyncResult = {
      tagged: 0,
      removed: 0,
      variantsWalked: 0,
      publishPlaceholdersSeeded: 0,
      errors: [],
    };
    const comp = await instance.getComponent();
    const gate: TagSyncEnteredGate = { entered: false };
    let conditionalControllerPropIds = new Set<string>();
    try {
      ({ conditionalControllerPropIds } = await enterComponentDefinitionsAndWalk(
        instance,
        comp,
        exposed,
        out,
        gate,
        onProgress
      ));
    } finally {
      if (gate.entered) {
        await webflow.exitComponent().catch(() => undefined);
      }
    }
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
