import type { TowerUsageLimitsKind } from "@codalyn/webflow-kit";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import {
  accountSubscriptionPlanLabel,
  activeUsageTierLabel,
  usageLimitsKindBadgeLabel,
  usageLimitsPlanLabel,
} from "@/shared/lib/usage-display";
import { Badge } from "@/shared/ui/badge";

type UsagePlanBadgesProps = {
  tier: "free" | "pro" | "team";
  limitsKind: TowerUsageLimitsKind;
  entitlementSource?: TowerEntitlement["source"];
};

export function UsagePlanBadges(props: UsagePlanBadgesProps) {
  const { tier, limitsKind, entitlementSource } = props;
  const limitsLabel = usageLimitsKindBadgeLabel(limitsKind, tier);
  const source = entitlementSource ?? "none";
  const accountLabel = accountSubscriptionPlanLabel({ tier, source });
  const usageLabel = usageLimitsPlanLabel(tier);
  const contextLabel = source === "workspace_team" ? activeUsageTierLabel({ tier, source }) : null;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">Account: {accountLabel}</Badge>
      <Badge variant="outline">{usageLabel}</Badge>
      {contextLabel ? <Badge variant="outline">Active: {contextLabel}</Badge> : null}
      {limitsLabel ? <Badge variant="outline">{limitsLabel}</Badge> : null}
    </div>
  );
}
