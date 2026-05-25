import Link from "next/link";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { Button } from "@/shared/ui/button";
import { UsageApproachingLimitAlert } from "@/shared/ui/usage-approaching-limit-alert";

type TowerUsageApproachingBannerProps = {
  userId: string;
  activeOrganizationId: string | null;
  billingEnabled: boolean;
};

export async function TowerUsageApproachingBanner(props: TowerUsageApproachingBannerProps) {
  const { userId, activeOrganizationId, billingEnabled } = props;
  const status = await fetchEndUserUsageStatus(userId, activeOrganizationId);
  const meters = status.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );

  return (
    <UsageApproachingLimitAlert
      meters={meters}
      upgradeAction={
        billingEnabled && status.tier === "free" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">View billing</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
