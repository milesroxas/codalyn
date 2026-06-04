import { stripEngineCodalynAttrsFromComponentInstance } from "@/features/cms-slots/model/cms-slot-engine-codalyn-attr-sync";
import {
  readAllExposedPropIdsForContainer,
  readCmsSlotEngineSlotPropsFile,
  writeCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  getCmsSlotListTargetCmsFieldIdFromListContainer,
  resolveCmsSlotListTargetCmsCollectionIdForCleanup,
  tryDeleteCmsSlotListTargetCmsPlainTextField,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import {
  removeAllCmsSlotListTargetInstancesOnPage,
  removeAllInstancesOfComponentOnPage,
} from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  filterHydratedCmsSlotRowsByComponentIds,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
  writeCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  getCmsSlotListTargetComponentOrNull,
  listCmsSlotListTargetComponentsByDataList,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/** Site component id + label for the Composer palette (types allowed by Engine for a CMS slot). */
export type CmsSlotPaletteEntry = { id: string; name: string; group: string | null };

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
 * Places a new instance of the given component as the last child of the target container.
 */
export async function appendComponentToSlotListContainer(
  container: BlockElement,
  componentId: string
): Promise<ComponentElement> {
  const component = await webflow.getComponent(componentId);
  return (await container.append(component)) as ComponentElement;
}

export async function removeComponentInstanceFromCanvas(instance: ComponentElement): Promise<void> {
  await instance.remove();
}

/**
 * Strips this CMS slot's `data-cb-c` / `data-cb-v` tags from the Engine component
 * definitions placed in `container`, **before** the list block (or install wrapper) is removed.
 *
 * The tags live on shared, site-level component definitions (the Engine component's own definition and any nested
 * component definitions linked through exposed props), not on the page instances — so removing the block/instances
 * alone leaves those definitions tagged. The strip is scoped to the prop ids this slot owns
 * ({@link readAllExposedPropIdsForContainer}) so a definition shared with Engine components in other lists/slots on
 * the page keeps the segments those components own. Best-effort: per-instance strip failures are logged and never
 * block deletion.
 */
export async function stripEngineCodalynAttrsForSlotListContainer(container: BlockElement): Promise<void> {
  const ownerExposedIds = new Set(await readAllExposedPropIdsForContainer(container));
  for (const row of await listInstancesInSlotListContainer(container)) {
    const strip = await stripEngineCodalynAttrsFromComponentInstance(row.instance, ownerExposedIds);
    if (strip.errors.length > 0) {
      console.warn("[beacon] engine attr strip before list delete (non-fatal):", strip.errors);
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
 * removes the hidden CMS slot block. Order: strip this slot's Engine `data-cb-*` tags off the shared component
 * definitions ({@link stripEngineCodalynAttrsForSlotListContainer}) → resolve definition + CMS ids from `container` →
 * remove instances → `unregisterComponent` → delete CMS field → remove the block, so Webflow is not left with orphan
 * list-target nodes, stale `data-cb-c` tags on shared/nested component definitions, a definition that still references
 * removed structure, or a dangling per-list Plain Text field.
 */
export async function deleteCmsSlotListAndListTargetDefinition(
  dataList: string,
  container: BlockElement,
  preferredDefinitionId?: string | null
): Promise<void> {
  await stripEngineCodalynAttrsForSlotListContainer(container);
  await purgeCmsSlotRuntimeForDataList(dataList, container, preferredDefinitionId);
  await removeCmsSlotListFromPage(container);
}

export type CmsSlotCompositionDraftRow = {
  key: string;
  componentId: string;
  name: string;
  /**
   * Composer-only values for engine-exposed component props, keyed by `propId`.
   * Saved in the list target CMS JSON as {@link import("@/features/cms-slots/model/cms-slot-list-runtime-payload").CmsSlotListRuntimePayload.p}.
   */
  propValues?: Record<string, string>;
};

/**
 * Ensures the hidden Engine list has at least one instance per component type in `draft`. Appends missing
 * types (existing rows first, then first-seen draft order) and refreshes configured ids + slot props length.
 */
export async function ensureEnginePoolHasDraftComponentTypes(
  container: BlockElement,
  draft: ReadonlyArray<{ componentId: string }>
): Promise<HydratedCmsSlotRow[]> {
  let rows = await listInstancesInSlotListContainer(container);
  const configured = await resolveCmsSlotEngineConfiguredComponentIds(container, rows);
  let scoped = filterHydratedCmsSlotRowsByComponentIds(rows, configured);

  const present = new Set(scoped.map((row) => row.componentId));
  const toAppend: string[] = [];
  for (const row of draft) {
    if (!present.has(row.componentId)) {
      toAppend.push(row.componentId);
      present.add(row.componentId);
    }
  }

  if (toAppend.length === 0) {
    return scoped;
  }

  for (const componentId of toAppend) {
    await appendComponentToSlotListContainer(container, componentId);
  }

  rows = await listInstancesInSlotListContainer(container);
  await writeCmsSlotEngineConfiguredComponentIds(
    container,
    rows.map((row) => row.componentId)
  );
  const slotFile = await readCmsSlotEngineSlotPropsFile(container, rows.length);
  await writeCmsSlotEngineSlotPropsFile(container, slotFile);

  const configuredAfter = await resolveCmsSlotEngineConfiguredComponentIds(container, rows);
  scoped = filterHydratedCmsSlotRowsByComponentIds(rows, configuredAfter);
  return scoped;
}

/**
 * Replaces all component instances inside a CMS slot container so their types and order match `draft`.
 * Used by Composer save so the hidden list, designer preview, and published runtime stay aligned.
 */
export async function applyCmsSlotCompositionDraft(
  container: BlockElement,
  draft: Array<{ componentId: string }>
): Promise<HydratedCmsSlotRow[]> {
  return runExclusiveDesignerOp(async () => {
    const children = await container.getChildren();
    for (const ch of children) {
      if (ch.type === "ComponentInstance") {
        await (ch as ComponentElement).remove();
      }
    }
    for (const row of draft) {
      await appendComponentToSlotListContainer(container, row.componentId);
    }
    return listInstancesInSlotListContainer(container);
  });
}
