import { useEffect, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { listComposableMetaByInstanceKey } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";

/**
 * Load composable prop metadata for each selected Designer row (for “Expose to Composer” checkboxes).
 */
export function useCompositionComposableMeta(selected: HydratedCmsSlotRow[]) {
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
