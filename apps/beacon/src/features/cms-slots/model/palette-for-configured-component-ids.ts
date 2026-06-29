import {
  cachedComponentName,
  cachedComponentSettings,
  getCachedComponentById,
} from "@/features/cms-slots/model/cms-slot-component-def-cache";
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

  // getComponent/getName/getSettings are bridge round-trips; resolve each key concurrently so stale keys don't
  // serialize. Live-seed keys are resolved synchronously from rows. Order is preserved by Promise.all.
  const out = await Promise.all(
    poolKeys.map(async (poolKey): Promise<CmsSlotPaletteEntry | null> => {
      const option = parsePoolOptionKey(poolKey);
      if (option === null) {
        return null;
      }
      const fromRows = rowByPoolKey.get(poolKey);
      if (fromRows != null) {
        return {
          poolKey,
          componentId: fromRows.componentId,
          variant: fromRows.variant,
          name: poolOptionLabel(fromRows.name, fromRows.variant),
          group: null,
        };
      }
      try {
        // Cached by component id and shared with the instance reads in the same open — a palette key whose component
        // also appears as a live seed resolves its name/settings without an extra round-trip.
        const comp = await getCachedComponentById(option.componentId);
        const [name, settings] = await Promise.all([cachedComponentName(comp), cachedComponentSettings(comp)]);
        const label = option.variantId != null ? `${name} · ${option.variantId}` : name;
        // Variant prop id is unknown without a live seed, so a stale key can't be re-pinned; treat as base.
        return { poolKey, componentId: option.componentId, variant: null, name: label, group: settings.group };
      } catch {
        /* component deleted; skip stale keys */
        return null;
      }
    })
  );
  return out.filter((entry): entry is CmsSlotPaletteEntry => entry !== null);
}
