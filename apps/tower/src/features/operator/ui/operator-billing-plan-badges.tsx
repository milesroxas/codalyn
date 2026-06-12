import { IconCreditCard } from "@tabler/icons-react";
import { Badge } from "@/shared/ui/badge";

export type OperatorBillingPlanBadgesProps = {
  planLabel: string;
  isFreePlan: boolean;
  subscriptionStatus?: string | null;
};

export function OperatorBillingPlanBadges(props: OperatorBillingPlanBadgesProps) {
  const { planLabel, isFreePlan, subscriptionStatus } = props;
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant={isFreePlan ? "outline" : "secondary"} className="gap-1">
        <IconCreditCard className="size-3" />
        {planLabel}
      </Badge>
      {subscriptionStatus && !isFreePlan ? <Badge variant="outline">{subscriptionStatus}</Badge> : null}
    </div>
  );
}
