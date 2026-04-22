import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { BEACON_UTILITIES_COMPONENT_GROUP } from "@/features/beacons/model/create-beacon-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

/** Site component id + label for the Composer palette (types allowed by Engine for a beacon list). */
export type BeaconPaletteEntry = { id: string; name: string; group: string | null };

function excludeBeaconUtilitiesGroup(results: ComponentSearchResult[]): ComponentSearchResult[] {
  return results.filter((r) => r.group !== BEACON_UTILITIES_COMPONENT_GROUP);
}

/**
 * All site components, optionally filtered the same way as the Components panel (when available).
 * Excludes the Beacon Utilities group (internal list-target / helper definitions).
 */
export async function listSiteComponentsForPicker(query: string): Promise<ComponentSearchResult[]> {
  if (typeof webflow.searchComponents === "function") {
    return excludeBeaconUtilitiesGroup(await webflow.searchComponents({ q: query }));
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
  const withoutUtilities = excludeBeaconUtilitiesGroup(rows);
  const q = query.trim().toLowerCase();
  if (!q) return withoutUtilities;
  return withoutUtilities.filter((r) => r.name.toLowerCase().includes(q) || r.group.toLowerCase().includes(q));
}

/**
 * Places a new instance of the given component as the last child of the target container.
 */
export async function appendComponentToBeacon(container: BlockElement, componentId: string): Promise<ComponentElement> {
  const component = await webflow.getComponent(componentId);
  return (await container.append(component)) as ComponentElement;
}

export async function removeComponentInstanceFromCanvas(instance: ComponentElement): Promise<void> {
  await instance.remove();
}

/**
 * Removes the beacon target **Block** (and any child component instances) from the page.
 */
export async function removeBeaconTargetFromPage(container: BlockElement): Promise<void> {
  await container.remove();
}

export type BeaconCompositionDraftRow = {
  key: string;
  componentId: string;
  name: string;
};

/**
 * Replaces all component instances inside a beacon list container so their types and order match `draft`.
 * Used by Composer save so the hidden list, designer preview, and published runtime stay aligned.
 */
export async function applyBeaconCompositionDraft(
  container: BlockElement,
  draft: Array<{ componentId: string }>
): Promise<HydratedBeaconComponent[]> {
  return runExclusiveDesignerStyleOp(async () => {
    const children = await container.getChildren();
    for (const ch of children) {
      if (ch.type === "ComponentInstance") {
        await (ch as ComponentElement).remove();
      }
    }
    const out: HydratedBeaconComponent[] = [];
    for (const row of draft) {
      const instance = await appendComponentToBeacon(container, row.componentId);
      const comp = await webflow.getComponent(row.componentId);
      const name = await comp.getName();
      out.push({ key: crypto.randomUUID(), componentId: row.componentId, name, instance });
    }
    return out;
  });
}
