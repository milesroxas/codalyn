import type { TowerUsageLimitsKind } from "@codalyn/webflow-kit";
import { usageLimitsKindBadgeLabel, usageTierBadgeLabel } from "@/shared/lib/usage-display";
import { Badge } from "@/shared/ui/badge";

type UsagePlanBadgesProps = {
  tier: "free" | "pro";
  limitsKind: TowerUsageLimitsKind;
};

export function UsagePlanBadges(props: UsagePlanBadgesProps) {
  const { tier, limitsKind } = props;
  const limitsLabel = usageLimitsKindBadgeLabel(limitsKind, tier);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{usageTierBadgeLabel(tier)}</Badge>
      {limitsLabel ? <Badge variant="outline">{limitsLabel}</Badge> : null}
    </div>
  );
}
