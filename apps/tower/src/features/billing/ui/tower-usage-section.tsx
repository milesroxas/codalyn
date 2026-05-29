import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { towerUsageLimitResetDetailLine } from "@codalyn/webflow-kit";
import Link from "next/link";
import { UsageLimitsPlanHeader } from "@/features/billing/ui/usage-plan-badges";
import { usageLimitsKindDetailLine } from "@/shared/lib/usage-display";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { UsageFeatureUsageDisplay } from "@/shared/ui/usage-feature-usage-display";

type TowerUsageSectionProps = {
  status: TowerUsageStatusSnapshot;
  billingEnabled?: boolean;
  showBillingLink?: boolean;
  fillHeight?: boolean;
  title?: string;
  description?: string;
};

export function TowerUsageSection(props: TowerUsageSectionProps) {
  const {
    status,
    billingEnabled = false,
    showBillingLink = false,
    fillHeight = false,
    title = "Monthly usage",
    description = "Usage by Beacon feature for your signed-in account. Limits reset on the first day of each month.",
  } = props;

  const resetLine = towerUsageLimitResetDetailLine();
  const limitsDetail = usageLimitsKindDetailLine(status.limitsKind, status.tier);

  return (
    <Card layout={fillHeight ? "fill" : "default"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            {limitsDetail ? <p className="text-xs text-muted-foreground">{limitsDetail}</p> : null}
          </div>
          <UsageLimitsPlanHeader resetLine={resetLine} tier={status.tier} limitsKind={status.limitsKind} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageFeatureUsageDisplay status={status} />
      </CardContent>
      {showBillingLink && billingEnabled && status.tier === "free" ? (
        <CardFooter className="justify-end border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">Manage billing</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
