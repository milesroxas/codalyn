import { poolOptionLabel } from "@/features/cms-slots/model/cms-slot-instance-variant";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { parsePoolOptionKey } from "@/features/cms-slots/model/cms-slot-pool-option";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";

/**
 * Builds the Composer palette from configured **pool keys** (component + pinned variant). Each key is one option, so
 * two variants of the same component (e.g. split-content image-left / image-right) appear as distinct entries, labeled
 * with the variant name. Keys whose seed is present in `rows` use the live name/variant; absent keys fall back to the
 * component definition name (variant name unavailable without the instance, so the id stands in).
 */
export async function paletteForConfiguredPoolKeys(
  poolKeys: readonly string[],
  rows: HydratedCmsSlotRow[]
): Promise<CmsSlotPaletteEntry[]> {
  const rowByPoolKey = new Map<string, HydratedCmsSlotRow>();
  for (const row of rows) {
    if (!rowByPoolKey.has(row.poolKey)) {
      rowByPoolKey.set(row.poolKey, row);
    }
  }

  const out: CmsSlotPaletteEntry[] = [];
  for (const poolKey of poolKeys) {
    const option = parsePoolOptionKey(poolKey);
    if (option === null) {
      continue;
    }
    const fromRows = rowByPoolKey.get(poolKey);
    if (fromRows != null) {
      out.push({
        poolKey,
        componentId: fromRows.componentId,
        variant: fromRows.variant,
        name: poolOptionLabel(fromRows.name, fromRows.variant),
        group: null,
      });
      continue;
    }
    try {
      const comp = await webflow.getComponent(option.componentId);
      const name = await comp.getName();
      const group = (await comp.getSettings()).group;
      const label = option.variantId != null ? `${name} · ${option.variantId}` : name;
      // Variant prop id is unknown without a live seed, so a stale key can't be re-pinned; treat as base.
      out.push({ poolKey, componentId: option.componentId, variant: null, name: label, group });
    } catch {
      /* component deleted; skip stale keys */
    }
  }
  return out;
}
