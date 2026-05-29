import {
  CMS_SLOT_BEACON_BIND_ATTR,
  CMS_SLOT_BEACON_PROP_ATTR,
  canonicalPropIdFromBeaconPropAttrSegment,
  cmsSlotBeaconBindIdFromElement,
  formatBeaconPropAttrSegmentsForBindings,
  removeBeaconCodalynAttrsIfPresent,
} from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { resolveElementBindingsSettings } from "@/features/cms-slots/model/cms-slot-engine-element-bindings";
import {
  seedHiddenListPublishPlaceholders,
  seedNestedPublishPlaceholdersOnPlacedInstance,
} from "@/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders";
import {
  bindingPropIdFromSettingValue,
  canonicalExposedPropId,
  collectNestedPublishSeedPairsFromBinding,
  nestedAliasForComponentInstance,
  nestedPublishSeedPairKey,
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
  /** Instance props seeded so Webflow conditional visibility includes tagged nodes at publish. */
  publishPlaceholdersSeeded: number;
  errors: string[];
};

export type EngineCodalynAttrStripResult = {
  removed: number;
  errors: string[];
};

export type EngineTagWalkResult = {
  taggedPropIds: Set<string>;
  nestedPublishSeedPairKeys: Set<string>;
};

export { mapNestedPropsToExposedIds } from "@/features/cms-slots/model/cms-slot-nested-prop-alias";

function attrValueStillWanted(value: string, exposedIds: ReadonlySet<string>): boolean {
  const lowerExposed = new Set([...exposedIds].map((id) => id.toLowerCase()));
  for (const part of value.split("|")) {
    const canonical = canonicalPropIdFromBeaconPropAttrSegment(part);
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

async function nestedAliasForInstance(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>
): Promise<Map<string, string>> {
  return nestedAliasForComponentInstance(inst, exposedIds, upstreamAlias);
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

async function stripStaleCodalynAttr(
  attr: PropAttrOps,
  exposedIds: ReadonlySet<string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">
): Promise<void> {
  try {
    const existing = await attr.get(CMS_SLOT_BEACON_PROP_ATTR);
    if (existing != null && existing.length > 0 && !attrValueStillWanted(existing, exposedIds)) {
      await attr.remove(CMS_SLOT_BEACON_PROP_ATTR);
      out.removed += 1;
    }
    const bind = await attr.get(CMS_SLOT_BEACON_BIND_ATTR);
    if (bind != null && bind.length > 0) {
      const prop = await attr.get(CMS_SLOT_BEACON_PROP_ATTR);
      if (prop == null || prop.length === 0) {
        await attr.remove(CMS_SLOT_BEACON_BIND_ATTR);
        out.removed += 1;
      }
    }
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function applyCodalynAttrForBindings(
  attr: PropAttrOps,
  bindId: string,
  settings: Record<string, unknown>,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  taggedPropIds: Set<string>,
  propBindingCounts: Map<string, number>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  try {
    const fromExpose = collectExposedPropIdsFromSettings(settings, exposedIds, nestedAlias);
    const uniq = [...new Set(fromExpose)].sort();
    if (uniq.length === 0) {
      out.removed += await removeBeaconCodalynAttrsIfPresent(attr);
      return;
    }
    for (const pid of collectAllPropBindingPropIds(settings)) {
      const canonical = canonicalExposedId(pid, exposedIds, nestedAlias);
      if (canonical == null) {
        continue;
      }
      const pair = collectNestedPublishSeedPairsFromBinding(pid, canonical, nestedDepth);
      if (pair != null) {
        nestedPublishSeedPairKeys.add(nestedPublishSeedPairKey(pair));
      }
    }
    for (const pid of uniq) {
      taggedPropIds.add(pid);
    }
    const segments = formatBeaconPropAttrSegmentsForBindings(uniq, bindId, propBindingCounts);
    const nextVal = segments.join("|");
    const cur = await attr.get(CMS_SLOT_BEACON_PROP_ATTR);
    if (cur !== nextVal) {
      await attr.set(CMS_SLOT_BEACON_PROP_ATTR, nextVal);
      out.tagged += 1;
    }
    const curBind = await attr.get(CMS_SLOT_BEACON_BIND_ATTR);
    if (curBind !== bindId) {
      await attr.set(CMS_SLOT_BEACON_BIND_ATTR, bindId);
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
  taggedPropIds: Set<string>,
  propBindingCounts: Map<string, number>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  if (nestedDepth > MAX_DESIGNER_COMPONENT_NESTING) {
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
  try {
    await webflow.enterComponent(inst);
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
    return;
  }
  try {
    const root = await (await inst.getComponent()).getRootElement();
    if (root) {
      await walkTree(
        root,
        exposedIds,
        merged,
        out,
        taggedPropIds,
        propBindingCounts,
        nestedPublishSeedPairKeys,
        nestedDepth + 1
      );
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function syncElementCodalynAttr(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  taggedPropIds: Set<string>,
  propBindingCounts: Map<string, number>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr == null) {
    return;
  }
  await stripStaleCodalynAttr(attr, exposedIds, out);
  const settings = await resolveElementBindingsSettings(el);
  if (settings == null) {
    out.removed += await removeBeaconCodalynAttrsIfPresent(attr);
    return;
  }
  const bindId = cmsSlotBeaconBindIdFromElement(el);
  if (bindId == null) {
    out.removed += await removeBeaconCodalynAttrsIfPresent(attr);
    return;
  }
  await applyCodalynAttrForBindings(
    attr,
    bindId,
    settings,
    exposedIds,
    nestedAlias,
    out,
    taggedPropIds,
    propBindingCounts,
    nestedPublishSeedPairKeys,
    nestedDepth
  );
}

async function walkTree(
  el: AnyElement,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>,
  out: Pick<EngineCodalynAttrSyncResult, "tagged" | "removed" | "errors">,
  taggedPropIds: Set<string>,
  propBindingCounts: Map<string, number>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  await syncElementCodalynAttr(
    el,
    exposedIds,
    nestedAlias,
    out,
    taggedPropIds,
    propBindingCounts,
    nestedPublishSeedPairKeys,
    nestedDepth
  );
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await walkTree(
          ch,
          exposedIds,
          nestedAlias,
          out,
          taggedPropIds,
          propBindingCounts,
          nestedPublishSeedPairKeys,
          nestedDepth
        );
      }
    }
    await enterNestedDefinitionIfLinked(
      inst,
      exposedIds,
      nestedAlias,
      out,
      taggedPropIds,
      propBindingCounts,
      nestedPublishSeedPairKeys,
      nestedDepth
    );
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await walkTree(
        ch,
        exposedIds,
        nestedAlias,
        out,
        taggedPropIds,
        propBindingCounts,
        nestedPublishSeedPairKeys,
        nestedDepth
      );
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
  const taggedPropIds = new Set<string>();
  const propBindingCounts = new Map<string, number>();
  const nestedPublishSeedPairKeys = new Set<string>();
  await exitUntilPageForComponentEnter();
  onProgress?.(CMS_SLOTS_ROUTE_TASK_ENTERING_COMPONENT);
  await webflow.enterComponent(instance);
  gate.entered = true;
  onProgress?.(CMS_SLOTS_ROUTE_TASK_TAGGING_ELEMENTS);

  const root = await comp.getRootElement();
  if (root) {
    await walkTree(root, exposedIds, new Map(), out, taggedPropIds, propBindingCounts, nestedPublishSeedPairKeys, 0);
  }
  out.variantsWalked = 1;
  return { taggedPropIds, nestedPublishSeedPairKeys };
}

async function stripElementCodalynAttrs(el: AnyElement, out: EngineCodalynAttrStripResult): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr == null) {
    return;
  }
  try {
    out.removed += await removeBeaconCodalynAttrsIfPresent(attr);
  } catch (e) {
    out.errors.push(String(e instanceof Error ? e.message : e));
  }
}

async function enterNestedDefinitionAndStripCodalynAttrs(
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
      await stripTreeCodalynAttrs(root, out, nestedDepth + 1);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function stripTreeCodalynAttrs(
  el: AnyElement,
  out: EngineCodalynAttrStripResult,
  nestedDepth: number
): Promise<void> {
  await stripElementCodalynAttrs(el, out);
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await stripTreeCodalynAttrs(ch, out, nestedDepth);
      }
    }
    await enterNestedDefinitionAndStripCodalynAttrs(inst, out, nestedDepth);
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await stripTreeCodalynAttrs(ch, out, nestedDepth);
    }
  }
}

/**
 * Removes Engine `data-codalyn-beacon-prop` / `data-codalyn-beacon-bind` tags from a component definition
 * before the hidden-list instance is deleted so the site component is not left with stale CMS slot attrs.
 */
export function stripEngineCodalynAttrsFromComponentInstance(
  instance: ComponentElement
): Promise<EngineCodalynAttrStripResult> {
  return withComponentDefinitionScope(
    instance,
    async ({ definitionRoot }) => {
      const out: EngineCodalynAttrStripResult = { removed: 0, errors: [] };
      if (definitionRoot != null) {
        await stripTreeCodalynAttrs(definitionRoot, out, 0);
      }
      return out;
    },
    {
      onEnterFailed: () => ({ removed: 0, errors: ["Could not open this component for attribute cleanup."] }),
    }
  );
}

/**
 * Tags `data-codalyn-beacon-prop` and `data-codalyn-beacon-bind` on elements bound to exposed instance props.
 * Each tagged node gets a unique bind id; duplicate bindings to the same exposed prop use `propId@bindId` on later sites.
 * Enters nested component definitions only when `getProps()` shows their props are wired to an exposed parent prop.
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
    let taggedPropIds = new Set<string>();
    let nestedPublishSeedPairKeys = new Set<string>();
    try {
      ({ taggedPropIds, nestedPublishSeedPairKeys } = await enterComponentDefinitionsAndWalk(
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
      const parentSeeded = await seedHiddenListPublishPlaceholders(instance, exposed, taggedPropIds);
      const nestedSeeded = await seedNestedPublishPlaceholdersOnPlacedInstance(
        instance,
        exposed,
        taggedPropIds,
        nestedPublishSeedPairKeys
      );
      out.publishPlaceholdersSeeded = parentSeeded + nestedSeeded;
    } catch (e) {
      out.errors.push(String(e instanceof Error ? e.message : e));
    }
    return out;
  });
}
