import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useTowerUsageStatus } from "@/features/billing/model/use-tower-usage-status";
import { Button } from "@/shared/ui/button";
import { UsageApproachingLimitCompactBanner } from "@/shared/ui/usage-approaching-limit-compact-banner";

export function BeaconUsageApproachingBanner() {
  const { user } = useBeaconTowerSession();
  const { status } = useTowerUsageStatus(Boolean(user?.id));

  if (!status || status.approachingMeters.length === 0) {
    return null;
  }

  const meters = status.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );

  // Free upgrades and Team seat changes are both managed in Tower; pro/studio individuals have no in-app lever.
  const showBillingLever = status.tier === "free" || status.tier === "team";

  return (
    <UsageApproachingLimitCompactBanner
      meters={meters}
      usageScope={status.usageScope}
      upgradeAction={
        showBillingLever ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              openTowerAppPath("/billing");
            }}
          >
            Open Tower billing
          </Button>
        ) : undefined
      }
    />
  );
}
