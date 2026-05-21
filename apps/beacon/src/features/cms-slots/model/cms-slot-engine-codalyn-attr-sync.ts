import { CMS_SLOT_BEACON_PROP_ATTR } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
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
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import { exitCurrentComponentIfAny } from "@/features/image-editor/lib/with-image-element-for-page-target";

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

export type EngineCodalynAttrSyncResult = {
  tagged: number;
  removed: number;
  variantsWalked: number;
  /** Instance props seeded so Webflow conditional visibility includes tagged nodes at publish. */
  publishPlaceholdersSeeded: number;
  errors: string[];
};

export type EngineTagWalkResult = {
  taggedPropIds: Set<string>;
  nestedPublishSeedPairKeys: Set<string>;
};

export { mapNestedPropsToExposedIds } from "@/features/cms-slots/model/cms-slot-nested-prop-alias";

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
  taggedPropIds: Set<string>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  try {
    const fromExpose = collectExposedPropIdsFromSettings(settings, exposedIds, nestedAlias);
    const uniq = [...new Set(fromExpose)].sort();
    if (uniq.length === 0) {
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
    const nextVal = uniq.join("|");
    const cur = await attr.get(CMS_SLOT_BEACON_PROP_ATTR);
    if (cur !== nextVal) {
      await attr.set(CMS_SLOT_BEACON_PROP_ATTR, nextVal);
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
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  if (nestedDepth > MAX_NESTED_COMPONENT_EXITS) {
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
      await walkTree(root, exposedIds, merged, out, taggedPropIds, nestedPublishSeedPairKeys, nestedDepth + 1);
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
  taggedPropIds: Set<string>,
  nestedPublishSeedPairKeys: Set<string>,
  nestedDepth: number
): Promise<void> {
  const attr = propAttrOpsFor(el);
  if (attr) {
    await stripStaleCodalynAttr(attr, exposedIds, out);
  }
  if (hasElementSettings(el) && attr) {
    const settings = await (el as AnyElement & { getSettings: () => Promise<Record<string, unknown>> }).getSettings();
    await applyCodalynAttrForBindings(
      attr,
      settings,
      exposedIds,
      nestedAlias,
      out,
      taggedPropIds,
      nestedPublishSeedPairKeys,
      nestedDepth
    );
  }
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
    for (const slot of slots) {
      if (!hasChildren(slot as unknown as AnyElement)) {
        continue;
      }
      for (const ch of await slot.getChildren()) {
        await walkTree(ch, exposedIds, nestedAlias, out, taggedPropIds, nestedPublishSeedPairKeys, nestedDepth);
      }
    }
    await enterNestedDefinitionIfLinked(
      inst,
      exposedIds,
      nestedAlias,
      out,
      taggedPropIds,
      nestedPublishSeedPairKeys,
      nestedDepth
    );
    return;
  }
  if (hasChildren(el)) {
    for (const ch of await el.getChildren()) {
      await walkTree(ch, exposedIds, nestedAlias, out, taggedPropIds, nestedPublishSeedPairKeys, nestedDepth);
    }
  }
}

type TagSyncEnteredGate = { entered: boolean };

async function enterComponentDefinitionsAndWalk(
  instance: ComponentElement,
  comp: Component,
  exposed: readonly ComposableInstancePropMeta[],
  out: EngineCodalynAttrSyncResult,
  gate: TagSyncEnteredGate
): Promise<EngineTagWalkResult> {
  const exposedIds = new Set(exposed.map((e) => e.propId));
  const taggedPropIds = new Set<string>();
  const nestedPublishSeedPairKeys = new Set<string>();
  await exitUntilPageForInstanceEnter();
  await webflow.enterComponent(instance);
  gate.entered = true;

  const root = await comp.getRootElement();
  if (root) {
    await walkTree(root, exposedIds, new Map(), out, taggedPropIds, nestedPublishSeedPairKeys, 0);
  }
  out.variantsWalked = 1;
  return { taggedPropIds, nestedPublishSeedPairKeys };
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
        gate
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
