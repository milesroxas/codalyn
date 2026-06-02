import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import Link from "next/link";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { getTowerSessionOnboardingContext } from "@/server/tower-onboarding-context";
import { Button } from "@/shared/ui/button";
import { UsageApproachingLimitAlert } from "@/shared/ui/usage-approaching-limit-alert";

type TowerUsageApproachingBannerProps = {
  userId: string;
  activeOrganizationId: string | null;
  billingEnabled: boolean;
};

function bannerActionLabel(
  status: TowerUsageStatusSnapshot,
  isTeamAdmin: boolean,
  billingEnabled: boolean
): string | null {
  if (!billingEnabled) {
    return null;
  }
  if (status.tier === "free") {
    return "View billing";
  }
  if (status.usageScope === "workspace" && isTeamAdmin) {
    return "Manage team billing";
  }
  return null;
}

export async function TowerUsageApproachingBanner(props: TowerUsageApproachingBannerProps) {
  const { userId, activeOrganizationId, billingEnabled } = props;
  const status = await fetchEndUserUsageStatus(userId, activeOrganizationId);
  const meters = status.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );
  // Pooled Team caps grow by adding seats, so only workspace admins get the actionable lever.
  const isTeamAdmin =
    status.usageScope === "workspace" ? (await getTowerSessionOnboardingContext()).activeOrgTeamAdmin : false;
  const actionLabel = bannerActionLabel(status, isTeamAdmin, billingEnabled);

  return (
    <UsageApproachingLimitAlert
      meters={meters}
      usageScope={status.usageScope}
      upgradeAction={
        actionLabel ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">{actionLabel}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
