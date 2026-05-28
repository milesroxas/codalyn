import type { TowerUsageLimitsKind } from "@codalyn/webflow-kit";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import { billingAccountPlanLabel, usageLimitsKindBadgeLabel, usageTierBadgeLabel } from "@/shared/lib/usage-display";
import { Badge } from "@/shared/ui/badge";

type UsagePlanBadgesProps = {
  tier: "free" | "pro";
  limitsKind: TowerUsageLimitsKind;
  entitlementSource?: TowerEntitlement["source"];
};

export function UsagePlanBadges(props: UsagePlanBadgesProps) {
  const { tier, limitsKind, entitlementSource } = props;
  const limitsLabel = usageLimitsKindBadgeLabel(limitsKind, tier);
  const planLabel =
    entitlementSource != null
      ? billingAccountPlanLabel({ tier, source: entitlementSource })
      : usageTierBadgeLabel(tier);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{planLabel}</Badge>
      {limitsLabel ? <Badge variant="outline">{limitsLabel}</Badge> : null}
    </div>
  );
}
