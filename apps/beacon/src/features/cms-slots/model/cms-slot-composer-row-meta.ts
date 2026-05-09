import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

/** One target row in Composer with Engine-exposed prop metadata (order aligns with `draft`). */
export type CmsSlotComposerRowMeta = {
  row: CmsSlotCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
};
