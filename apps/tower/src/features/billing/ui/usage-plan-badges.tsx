import type { TowerUsageLimitsKind, TowerUsageTier } from "@codalyn/webflow-kit";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import {
  accountSubscriptionPlanLabel,
  activeUsageTierLabel,
  usageLimitsKindBadgeLabel,
  usageLimitsPlanLabel,
  usagePlanBadgeLabel,
} from "@/shared/lib/usage-display";
import { Badge } from "@/shared/ui/badge";
import { UsageLimitsHeaderMeta } from "@/shared/ui/usage-limits-reset-label";

type UsagePlanBadgesProps = {
  tier: TowerUsageTier;
  limitsKind: TowerUsageLimitsKind;
  entitlementSource?: TowerEntitlement["source"];
  /** When false, omits individual subscription badge (e.g. dashboard usage card). */
  showAccountBadge?: boolean;
  /** `plan` for usage cards; `limits` for account/billing summary. */
  tierBadgeStyle?: "limits" | "plan";
};

function UsagePlanBadges(props: UsagePlanBadgesProps) {
  const { tier, limitsKind, entitlementSource, showAccountBadge = true, tierBadgeStyle = "limits" } = props;
  const limitsLabel = usageLimitsKindBadgeLabel(limitsKind, tier);
  const source = entitlementSource ?? "none";
  const accountLabel = accountSubscriptionPlanLabel({ tier, source });
  const usageLabel = tierBadgeStyle === "plan" ? usagePlanBadgeLabel(tier) : usageLimitsPlanLabel(tier);
  const contextLabel = source === "workspace_team" ? activeUsageTierLabel({ tier, source }) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {showAccountBadge ? <Badge variant="secondary">Account: {accountLabel}</Badge> : null}
      <Badge variant="outline">{usageLabel}</Badge>
      {contextLabel ? <Badge variant="outline">Active: {contextLabel}</Badge> : null}
      {limitsLabel ? <Badge variant="outline">{limitsLabel}</Badge> : null}
    </div>
  );
}

/** Plan badges for usage meters — active workspace tier only. */
function UsageLimitsBadges(
  props: Omit<UsagePlanBadgesProps, "showAccountBadge" | "entitlementSource" | "tierBadgeStyle">
) {
  return <UsagePlanBadges {...props} showAccountBadge={false} tierBadgeStyle="plan" />;
}

type UsageLimitsPlanHeaderProps = {
  resetLine: string;
  tier: TowerUsageTier;
  limitsKind: TowerUsageLimitsKind;
};

/** Reset schedule plus plan badges for usage cards. */
export function UsageLimitsPlanHeader(props: UsageLimitsPlanHeaderProps) {
  const { resetLine, tier, limitsKind } = props;

  return (
    <UsageLimitsHeaderMeta resetLine={resetLine}>
      <UsageLimitsBadges tier={tier} limitsKind={limitsKind} />
    </UsageLimitsHeaderMeta>
  );
}
