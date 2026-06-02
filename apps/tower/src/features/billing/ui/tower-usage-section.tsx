import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import {
  towerUsageLimitResetDetailLine,
  towerUsageScopeDescription,
  towerUsageScopeSummary,
} from "@codalyn/webflow-kit";
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
  /** Workspace admin on the active paid Team workspace; enables the "Manage team billing" lever. */
  canManageWorkspaceBilling?: boolean;
  fillHeight?: boolean;
  /** Pass null to suppress the in-card title when an enclosing section already labels the block. */
  title?: string | null;
  /** Pass null to suppress the in-card description when an enclosing section already describes the block. */
  description?: string | null;
};

/** Billing CTA for the usage card footer: grow the cap for the relevant scope, or null when there is none. */
function usageBillingCta(
  status: TowerUsageStatusSnapshot,
  canManageWorkspaceBilling: boolean
): { label: string } | null {
  if (status.tier === "free") {
    return { label: "Manage billing" };
  }
  if (status.usageScope === "workspace" && canManageWorkspaceBilling) {
    return { label: "Manage team billing" };
  }
  return null;
}

export function TowerUsageSection(props: TowerUsageSectionProps) {
  const {
    status,
    billingEnabled = false,
    showBillingLink = false,
    canManageWorkspaceBilling = false,
    fillHeight = false,
    title = "Monthly usage",
    description = towerUsageScopeDescription(status.usageScope),
  } = props;

  const resetLine = towerUsageLimitResetDetailLine();
  const limitsDetail = usageLimitsKindDetailLine(status.limitsKind, status.tier);
  const scopeSummary = towerUsageScopeSummary(status.usageScope, status.pooledSeatCount);
  const billingCta = showBillingLink && billingEnabled ? usageBillingCta(status, canManageWorkspaceBilling) : null;

  return (
    <Card layout={fillHeight ? "fill" : "default"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
            <p className="text-xs text-muted-foreground">{scopeSummary}</p>
            {limitsDetail ? <p className="text-xs text-muted-foreground">{limitsDetail}</p> : null}
          </div>
          <UsageLimitsPlanHeader resetLine={resetLine} tier={status.tier} limitsKind={status.limitsKind} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageFeatureUsageDisplay status={status} />
      </CardContent>
      {billingCta ? (
        <CardFooter className="justify-end border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">{billingCta.label}</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
