import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import Link from "next/link";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { UsagePlanBadges } from "@/features/billing/ui/usage-plan-badges";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import {
  accountSubscriptionPlanLabel,
  activeUsageTierLabel,
  buildBillingPlanPresentation,
  usageLimitsKindDetailLine,
  usageLimitsPlanLabel,
  usagePlanBadgeLabel,
} from "@/shared/lib/usage-display";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

type TowerBillingScreenProps = {
  email: string | null | undefined;
  entitlement: TowerEntitlement;
  usageStatus: TowerUsageStatusSnapshot;
  /** Individual Pro subscription status from `user` row; omit for workspace-only access. */
  individualSubscriptionStatus?: string | null;
  checkoutAvailable: boolean;
  showIndividualPortal: boolean;
};

function formatSubscriptionStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }
  return status.replaceAll("_", " ");
}

type PlanFactProps = {
  label: string;
  value: string;
  detail?: string | null;
};

function PlanFact({ label, value, detail }: PlanFactProps) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
      <p className="font-medium text-foreground text-sm">{value}</p>
      {detail ? <p className="text-muted-foreground text-sm">{detail}</p> : null}
    </div>
  );
}

export function TowerBillingScreen(props: TowerBillingScreenProps) {
  const { email, entitlement, usageStatus, checkoutAvailable, showIndividualPortal, individualSubscriptionStatus } =
    props;

  const presentation = buildBillingPlanPresentation(entitlement);
  const limitsDetail = usageLimitsKindDetailLine(usageStatus.limitsKind, entitlement.tier);
  const accountPlan = accountSubscriptionPlanLabel(entitlement);
  const showUpgrade = accountPlan === "Free" && checkoutAvailable;
  const showPlanActions = showUpgrade || (showIndividualPortal && entitlement.source === "user_stripe");
  const manageWorkspaceBilling = entitlement.source === "workspace_team";

  const accountStatusLine =
    entitlement.source === "user_stripe" ? formatSubscriptionStatus(individualSubscriptionStatus) : null;

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Billing & usage"
        description="Individual Pro subscription and usage limits for your active workspace."
        meta={
          email ? (
            <span>
              Signed in as <span className="font-medium text-foreground">{email}</span>
            </span>
          ) : null
        }
      />

      <Card className="mb-10">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription className="space-y-4">
            <UsagePlanBadges
              tier={entitlement.tier}
              entitlementSource={entitlement.source}
              limitsKind={usageStatus.limitsKind}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PlanFact
                label="Individual subscription"
                value={presentation.accountPlan}
                detail={presentation.accountDetail}
              />
              <PlanFact
                label="Usage limits (active workspace)"
                value={activeUsageTierLabel(entitlement)}
                detail={limitsDetail ?? presentation.usageDetail}
              />
            </div>
            {manageWorkspaceBilling ? (
              <p className="text-muted-foreground text-sm">
                <Link href="/team" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Open Team
                </Link>{" "}
                to manage workspace seats and Team billing. Limits shown here follow{" "}
                {usageLimitsPlanLabel("team").toLowerCase()} while that workspace is selected.
              </p>
            ) : null}
            {accountStatusLine ? (
              <p className="text-muted-foreground text-sm">Pro subscription status: {accountStatusLine}</p>
            ) : null}
          </CardDescription>
          {showPlanActions ? (
            <CardAction align="center" group>
              {showUpgrade ? (
                <form action="/api/billing/checkout" method="post">
                  <Button type="submit">Subscribe to Pro</Button>
                </form>
              ) : null}
              {showIndividualPortal ? (
                <Button asChild variant="outline">
                  <a href="/api/billing/portal">Manage Pro subscription</a>
                </Button>
              ) : null}
            </CardAction>
          ) : null}
        </CardHeader>
      </Card>

      <TowerUsageSection
        status={usageStatus}
        title="This month"
        description={`Usage against ${usagePlanBadgeLabel(usageStatus.tier).toLowerCase()} for your active workspace.`}
      />
    </TowerPageMain>
  );
}
