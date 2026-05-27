import { isBeaconPropValueEmpty } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

/** True when a Composer draft row has at least one non-empty exposed prop value. */
export function composerDraftRowHasContent(row: Pick<CmsSlotCompositionDraftRow, "propValues">): boolean {
  const values = row.propValues ?? {};
  for (const value of Object.values(values)) {
    if (!isBeaconPropValueEmpty(value)) {
      return true;
    }
  }
  return false;
}
