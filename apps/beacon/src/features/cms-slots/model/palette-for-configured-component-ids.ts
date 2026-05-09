import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";

export async function paletteForConfiguredComponentIds(
  componentIds: readonly string[],
  rows: HydratedCmsSlotRow[]
): Promise<CmsSlotPaletteEntry[]> {
  const paletteById = new Map<string, CmsSlotPaletteEntry>();
  for (const row of rows) {
    if (!paletteById.has(row.componentId)) {
      paletteById.set(row.componentId, { id: row.componentId, name: row.name, group: null });
    }
  }

  const out: CmsSlotPaletteEntry[] = [];
  for (const componentId of componentIds) {
    const fromRows = paletteById.get(componentId);
    if (fromRows != null) {
      out.push(fromRows);
      continue;
    }
    try {
      const comp = await webflow.getComponent(componentId);
      const name = await comp.getName();
      const group = (await comp.getSettings()).group;
      out.push({ id: componentId, name, group });
    } catch {
      /* component deleted; skip stale ids */
    }
  }
  return out;
}
