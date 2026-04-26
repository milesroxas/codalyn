import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";

/** One target row in Composer with Engine-exposed prop metadata (order aligns with `draft`). */
export type BeaconComposerRowMeta = {
  row: BeaconCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
};
