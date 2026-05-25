import { useCallback, useState } from "react";

import type { TowerUsageLimitDetails, TowerUsageMeterKind } from "@/shared/lib/tower-usage-limit-error";

export function useTowerUsageLimitDialog() {
  const [details, setDetails] = useState<TowerUsageLimitDetails | null>(null);
  const [imageOptimizeLimitReached, setImageOptimizeLimitReached] = useState(false);

  const markMeterLimitReached = useCallback((kind: TowerUsageMeterKind) => {
    if (kind === "image") {
      setImageOptimizeLimitReached(true);
    }
  }, []);

  const reportUsageLimit = useCallback(
    (next: TowerUsageLimitDetails) => {
      setDetails(next);
      markMeterLimitReached(next.kind);
    },
    [markMeterLimitReached]
  );

  const dismiss = useCallback(() => {
    setDetails(null);
  }, []);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        dismiss();
      }
    },
    [dismiss]
  );

  return {
    open: details != null,
    details,
    imageOptimizeLimitReached,
    reportUsageLimit,
    onOpenChange,
  };
}
