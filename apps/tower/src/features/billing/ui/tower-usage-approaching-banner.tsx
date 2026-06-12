import { TowerUsageApproachingBannerClient } from "@/features/billing/ui/tower-usage-approaching-banner-client";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";

type TowerUsageApproachingBannerProps = {
  userId: string;
  activeOrganizationId: string | null;
};

export async function TowerUsageApproachingBanner(props: TowerUsageApproachingBannerProps) {
  const { userId, activeOrganizationId } = props;
  const status = await fetchEndUserUsageStatus(userId, activeOrganizationId);
  const meters = status.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );

  return <TowerUsageApproachingBannerClient meters={meters} usageScope={status.usageScope} />;
}
