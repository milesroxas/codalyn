import { useEffect, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import { listComposableMetaByInstanceKey } from "@/features/beacons/model/beacon-composable-props";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";

/**
 * Load composable prop metadata for each selected Engine row (for “Expose to Studio” checkboxes).
 */
export function useCompositionComposableMeta(selected: HydratedBeaconComponent[]) {
  const [composableByKey, setComposableByKey] = useState<Record<string, ComposableInstancePropMeta[]>>({});
  const [composableLoading, setComposableLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setComposableLoading(true);
    void (async () => {
      const next = await listComposableMetaByInstanceKey(selected);
      if (cancel) return;
      setComposableByKey(next);
      setComposableLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [selected]);

  return { composableByKey, composableLoading };
}
