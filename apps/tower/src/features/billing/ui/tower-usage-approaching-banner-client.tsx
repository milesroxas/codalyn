"use client";

import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";
import { TOWER_USAGE_APPROACHING_ALERT_DISMISS_LABEL } from "@codalyn/webflow-kit";
import { useEffect, useState } from "react";
import { towerUsageApproachingAlertDismissStorageKey } from "@/features/billing/lib/usage-approaching-alert-dismiss";
import { Button } from "@/shared/ui/button";
import { UsageApproachingLimitAlert } from "@/shared/ui/usage-approaching-limit-alert";

type TowerUsageApproachingBannerClientProps = {
  meters: ReadonlyArray<{ kind: TowerUsageMeterKind; used: number; limit: number }>;
  usageScope: TowerUsageScope;
};

export function TowerUsageApproachingBannerClient(props: TowerUsageApproachingBannerClientProps) {
  const { meters, usageScope } = props;
  const dismissStorageKey = towerUsageApproachingAlertDismissStorageKey(meters, usageScope);
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(dismissStorageKey) === "1");
  }, [dismissStorageKey]);

  if (meters.length === 0 || dismissed !== false) {
    return null;
  }

  return (
    <UsageApproachingLimitAlert
      meters={meters}
      usageScope={usageScope}
      upgradeAction={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            sessionStorage.setItem(dismissStorageKey, "1");
            setDismissed(true);
          }}
        >
          {TOWER_USAGE_APPROACHING_ALERT_DISMISS_LABEL}
        </Button>
      }
    />
  );
}
