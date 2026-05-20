import {
  removeAllCmsSlotListTargetInstancesOnPage,
  removeAllInstancesOfComponentOnPage,
} from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  getCmsSlotListTargetComponentOrNull,
  listCmsSlotListTargetComponentsByDataList,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/** Site component id + label for the Composer palette (types allowed by Engine for a beacon list). */
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
 * Removes the beacon target **Block** (and any child component instances) from the page.
 */
export async function removeCmsSlotListFromPage(container: BlockElement): Promise<void> {
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
 * If a Beacon list-target **site component** exists for this list (in {@link CMS_SLOT_UTILITIES_COMPONENT_GROUP}),
 * removes its **page instances** (Placed on canvas), unregisters the definition, then removes the hidden beacon list
 * block. Order: resolve definition from `container` → remove instances → `unregisterComponent` → remove the block so
 * Webflow is not left with orphan list-target nodes or a definition that still references removed structure.
 */
export async function deleteCmsSlotListAndListTargetDefinition(
  dataList: string,
  container: BlockElement,
  preferredDefinitionId?: string | null
): Promise<void> {
  await purgeCmsSlotListTargetDefinitionsForDataList(dataList, container, preferredDefinitionId);
  await removeCmsSlotListFromPage(container);
}

export type CmsSlotCompositionDraftRow = {
  key: string;
  componentId: string;
  name: string;
  /**
   * Studio-only values for engine-exposed component props, keyed by `propId`.
   * Saved in the list target CMS JSON as {@link import("@/features/cms-slots/model/cms-slot-list-runtime-payload").CmsSlotListRuntimePayload.p}.
   */
  propValues?: Record<string, string>;
};

/**
 * Replaces all component instances inside a beacon list container so their types and order match `draft`.
 * Used by Composer save so the hidden list, designer preview, and published runtime stay aligned.
 */
export async function applyCmsSlotCompositionDraft(
  container: BlockElement,
  draft: Array<{ componentId: string }>
): Promise<HydratedCmsSlotRow[]> {
  return runExclusiveDesignerStyleOp(async () => {
    const children = await container.getChildren();
    for (const ch of children) {
      if (ch.type === "ComponentInstance") {
        await (ch as ComponentElement).remove();
      }
    }
    const out: HydratedCmsSlotRow[] = [];
    for (const row of draft) {
      const instance = await appendComponentToSlotListContainer(container, row.componentId);
      const comp = await webflow.getComponent(row.componentId);
      const name = await comp.getName();
      out.push({ key: crypto.randomUUID(), componentId: row.componentId, name, instance });
    }
    return out;
  });
}
