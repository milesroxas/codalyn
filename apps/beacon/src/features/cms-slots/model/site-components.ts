import { stripDesignerCodalynAttrsFromComponentInstance } from "@/features/cms-slots/model/cms-slot-designer-codalyn-attr-sync";
import {
  readAllExposedPropIdsForContainer,
  readCmsSlotDesignerSlotPropsFile,
  writeCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import type { CmsSlotSelectedVariant } from "@/features/cms-slots/model/cms-slot-instance-variant";
import {
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  resolveCmsSlotListTargetCmsCollectionIdForCleanup,
  tryDeleteCmsSlotListTargetCmsPlainTextField,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import {
  removeAllCmsSlotListTargetInstancesOnPage,
  removeAllInstancesOfComponentOnPage,
} from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import {
  filterHydratedCmsSlotRowsByPoolKeys,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredPoolKeys,
  writeCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { poolOptionKey } from "@/features/cms-slots/model/cms-slot-pool-option";
import { buildSeedPropCopyEntries } from "@/features/cms-slots/model/cms-slot-seed-prop-copy";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  getCmsSlotListTargetComponentOrNull,
  listCmsSlotListTargetComponentsByDataList,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/**
 * One Composer palette option = one pool seed (component + pinned variant) the Designer allowed for a CMS slot.
 * `poolKey` is the stable identity; `name` is the display label (includes the variant name); `variant` carries the
 * `propId` needed to re-pin the variant when the seed is re-created on save.
 */
export type CmsSlotPaletteEntry = {
  poolKey: string;
  componentId: string;
  variant: CmsSlotSelectedVariant | null;
  name: string;
  group: string | null;
};

function excludeCmsSlotUtilitiesGroup(results: ComponentSearchResult[]): ComponentSearchResult[] {
  return results.filter((r) => r.group !== CMS_SLOT_UTILITIES_COMPONENT_GROUP);
}

/**
 * All site components, optionally filtered the same way as the Components panel (when available).
 * Excludes the Beacon Utilities group (internal list-target / helper definitions).
 */
export async function listSiteComponentsForPicker(query: string): Promise<ComponentSearchResult[]> {
  if (typeof webflow.searchComponents === "function") {
    return excludeCmsSlotUtilitiesGroup(await webflow.searchComponents({ q: query }));
  }
  const components = await webflow.getAllComponents();
  const rows = await Promise.all(
    components.map(async (c) => {
      const name = await c.getName();
      const settings = await c.getSettings();
      const instances = await c.getInstanceCount();
      return {
        id: c.id,
        name,
        group: settings.group,
        description: settings.description,
        instances,
        canEdit: true,
        library: null,
      } satisfies ComponentSearchResult;
    })
  );
  const withoutUtilities = excludeCmsSlotUtilitiesGroup(rows);
  const q = query.trim().toLowerCase();
  if (!q) return withoutUtilities;
  return withoutUtilities.filter((r) => r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q));
}

/**
 * Places a new instance of the given component as the last child of the target container, pinning its variant when
 * `variant` is provided. Pinning re-applies the Designer's variant selection that a destructive pool rebuild
 * (`applyCmsSlotCompositionDraft`) or a re-created seed would otherwise reset to base. Pin failures are non-fatal: the
 * seed still appends (it just renders on the base variant), so a save never aborts on one variant.
 */
export async function appendComponentToSlotListContainer(
  container: BlockElement,
  componentId: string,
  variant?: CmsSlotSelectedVariant | null
): Promise<ComponentElement> {
  const component = await webflow.getComponent(componentId);
  const instance = (await container.append(component)) as ComponentElement;
  if (variant != null) {
    try {
      await instance.setProps([{ propId: variant.propId, value: variant.variantId }]);
    } catch (e) {
      console.warn("[cms-slots] pin seed variant failed (non-fatal):", e);
    }
  }
  return instance;
}

export async function removeComponentInstanceFromCanvas(instance: ComponentElement): Promise<void> {
  await instance.remove();
}

/**
 * Pins (or clears, when `variantId` is the base id) the variant on a seed instance via `setProps`. Used by the Designer
 * seed-row variant picker so the hidden pool seed renders the chosen variant — the runtime then clones that baked seed.
 */
export async function setSeedInstanceVariant(
  instance: ComponentElement,
  propId: string,
  variantId: string
): Promise<void> {
  await instance.setProps([{ propId, value: variantId }]);
}

/**
 * Copies the source seed's explicit prop overrides onto `target` so a newly-added variant seed starts identical to the
 * one it was cloned from (the `variant` prop excluded — each seed keeps its own). Best-effort: a read/write failure is
 * logged and never blocks the add. Returns how many props were copied.
 */
export async function copySeedPropOverrides(source: ComponentElement, target: ComponentElement): Promise<number> {
  try {
    const entries = buildSeedPropCopyEntries(await source.searchProps());
    if (entries.length === 0) {
      return 0;
    }
    await target.setProps(entries);
    return entries.length;
  } catch (e) {
    console.warn("[cms-slots] copy seed prop overrides failed (non-fatal):", e);
    return 0;
  }
}

/**
 * Strips this CMS slot's `data-cb-c` / `data-cb-v` tags from the Designer component
 * definitions placed in `container`, **before** the list block (or install wrapper) is removed.
 *
 * The tags live on shared, site-level component definitions (the Designer component's own definition and any nested
 * component definitions linked through exposed props), not on the page instances — so removing the block/instances
 * alone leaves those definitions tagged. The strip is scoped to the prop ids this slot owns
 * ({@link readAllExposedPropIdsForContainer}) so a definition shared with Designer components in other lists/slots on
 * the page keeps the segments those components own. Best-effort: per-instance strip failures are logged and never
 * block deletion.
 */
export async function stripDesignerCodalynAttrsForSlotListContainer(container: BlockElement): Promise<void> {
  const ownerExposedIds = new Set(await readAllExposedPropIdsForContainer(container));
  for (const row of await listInstancesInSlotListContainer(container)) {
    const strip = await stripDesignerCodalynAttrsFromComponentInstance(row.instance, ownerExposedIds);
    if (strip.errors.length > 0) {
      console.warn("[beacon] designer attr strip before list delete (non-fatal):", strip.errors);
    }
  }
}

/**
 * Removes the beacon target **Block** (and any child component instances) from the page.
 */
async function removeCmsSlotListFromPage(container: BlockElement): Promise<void> {
  await container.remove();
}

/**
 * Removes every list-target site component for `dataList` (canvas instances first, then `unregisterComponent`).
 * Resolves by container/name when available, then scans Beacon Utilities definitions by root `data-list`.
 */
export async function purgeCmsSlotListTargetDefinitionsForDataList(
  dataList: string,
  listContainer?: BlockElement | null,
  preferredDefinitionId?: string | null
): Promise<void> {
  const definitions = new Map<string, Component>();
  if (listContainer != null) {
    const primary = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, preferredDefinitionId);
    if (primary != null) {
      definitions.set(primary.id, primary);
    }
  }
  for (const comp of await listCmsSlotListTargetComponentsByDataList(dataList)) {
    definitions.set(comp.id, comp);
  }
  if (listContainer != null && definitions.size > 0) {
    await removeAllCmsSlotListTargetInstancesOnPage(dataList, listContainer, { preferredDefinitionId });
  }
  for (const comp of definitions.values()) {
    await removeAllInstancesOfComponentOnPage(comp);
    try {
      await webflow.unregisterComponent(comp);
    } catch (e) {
      console.warn("[beacon] unregister list target component failed (non-fatal):", e);
    }
  }
}

/**
 * Single source of truth for removing **all runtime artifacts** of one CMS slot in its collection: the per-list
 * Plain Text CMS field, the list-target site component definitions, and their canvas instances. Resolves the
 * collection/field ids from the hidden list block **before** purging definitions (so they are still readable), then
 * best-effort deletes the field (no-op when already gone or Tower/API is unavailable). Does **not** remove the hidden
 * list block itself — callers that also delete the block use {@link deleteCmsSlotListAndListTargetDefinition}.
 */
export async function purgeCmsSlotRuntimeForDataList(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null
): Promise<void> {
  const collectionId = await resolveCmsSlotListTargetCmsCollectionIdForCleanup(listContainer);
  const fieldId = await getCmsSlotListTargetCmsFieldIdFromListContainer(listContainer);
  await purgeCmsSlotListTargetDefinitionsForDataList(dataList, listContainer, preferredDefinitionId);
  if (collectionId != null) {
    await tryDeleteCmsSlotListTargetCmsPlainTextField(collectionId, dataList, fieldId);
  }
}

/**
 * If a CMS slot list-target **site component** exists for this slot (in {@link CMS_SLOT_UTILITIES_COMPONENT_GROUP}),
 * removes its **page instances** (Placed on canvas), unregisters the definition, deletes the per-list CMS field, then
 * removes the hidden CMS slot block. Order: strip this slot's Designer `data-cb-*` tags off the shared component
 * definitions ({@link stripDesignerCodalynAttrsForSlotListContainer}) → resolve definition + CMS ids from `container` →
 * remove instances → `unregisterComponent` → delete CMS field → remove the block, so Webflow is not left with orphan
 * list-target nodes, stale `data-cb-c` tags on shared/nested component definitions, a definition that still references
 * removed structure, or a dangling per-list Plain Text field.
 */
export async function deleteCmsSlotListAndListTargetDefinition(
  dataList: string,
  container: BlockElement,
  preferredDefinitionId?: string | null
): Promise<void> {
  await stripDesignerCodalynAttrsForSlotListContainer(container);
  await purgeCmsSlotRuntimeForDataList(dataList, container, preferredDefinitionId);
  await removeCmsSlotListFromPage(container);
}

export type CmsSlotCompositionDraftRow = {
  key: string;
  componentId: string;
  /** Pool-option key (`componentId` + pinned variant) — selects which hidden seed this row clones at runtime. */
  poolKey: string;
  /** Variant pinned on this row's seed (carries `propId` for re-pinning), or `null` for the base seed. */
  variant: CmsSlotSelectedVariant | null;
  name: string;
  /**
   * Composer-only values for designer-exposed component props, keyed by `propId`.
   * Saved in the list target CMS JSON as {@link import("@/features/cms-slots/model/cms-slot-list-runtime-payload").CmsSlotListRuntimePayload.p}.
   */
  propValues?: Record<string, string>;
};

/** Pool-option key for a draft/selected row from its component + pinned variant. */
export function draftRowPoolKey(row: { componentId: string; variant: CmsSlotSelectedVariant | null }): string {
  return poolOptionKey({ componentId: row.componentId, variantId: row.variant?.variantId ?? null });
}

/** Pool seed to (re-)create: a component and the variant to pin on it. */
type CmsSlotPoolSeed = { componentId: string; variant: CmsSlotSelectedVariant | null };

/**
 * Ensures the hidden Designer list has at least one seed per **pool key** in `draft` (component + pinned variant).
 * Appends missing seeds — pinning the variant so a re-created split-content image-left seed comes back as image-left,
 * not base — and refreshes configured pool keys + slot props length.
 */
export async function ensureDesignerPoolHasDraftComponentTypes(
  container: BlockElement,
  draft: ReadonlyArray<CmsSlotPoolSeed>
): Promise<HydratedCmsSlotRow[]> {
  let rows = await listInstancesInSlotListContainer(container);
  const configured = await resolveCmsSlotDesignerConfiguredPoolKeys(container, rows);
  let scoped = filterHydratedCmsSlotRowsByPoolKeys(rows, configured);

  const present = new Set(scoped.map((row) => row.poolKey));
  const toAppend: CmsSlotPoolSeed[] = [];
  for (const row of draft) {
    const key = draftRowPoolKey(row);
    if (key.length > 0 && !present.has(key)) {
      toAppend.push({ componentId: row.componentId, variant: row.variant });
      present.add(key);
    }
  }

  if (toAppend.length === 0) {
    return scoped;
  }

  for (const seed of toAppend) {
    await appendComponentToSlotListContainer(container, seed.componentId, seed.variant);
  }

  rows = await listInstancesInSlotListContainer(container);
  await writeCmsSlotDesignerConfiguredPoolKeys(
    container,
    rows.map((row) => row.poolKey)
  );
  const slotFile = await readCmsSlotDesignerSlotPropsFile(container, rows.length);
  await writeCmsSlotDesignerSlotPropsFile(container, slotFile);

  const configuredAfter = await resolveCmsSlotDesignerConfiguredPoolKeys(container, rows);
  scoped = filterHydratedCmsSlotRowsByPoolKeys(rows, configuredAfter);
  return scoped;
}

/**
 * Replaces all component instances inside a CMS slot container so their seeds (component + pinned variant) and order
 * match `draft`. Used by Composer save so the hidden list, designer preview, and published runtime stay aligned.
 * Re-pins each row's variant after append so the destructive rebuild does not reset variants to base.
 */
export async function applyCmsSlotCompositionDraft(
  container: BlockElement,
  draft: Array<CmsSlotPoolSeed>
): Promise<HydratedCmsSlotRow[]> {
  return runExclusiveDesignerOp(async () => {
    const children = await container.getChildren();
    for (const ch of children) {
      if (ch.type === "ComponentInstance") {
        await (ch as ComponentElement).remove();
      }
    }
    for (const row of draft) {
      await appendComponentToSlotListContainer(container, row.componentId, row.variant);
    }
    return listInstancesInSlotListContainer(container);
  });
}
