import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { UsagePlanBadges } from "@/features/billing/ui/usage-plan-badges";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import { billingAccountPlanLabel, usageLimitsKindDetailLine } from "@/shared/lib/usage-display";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

type TowerBillingScreenProps = {
  email: string | null | undefined;
  entitlement: TowerEntitlement;
  usageStatus: TowerUsageStatusSnapshot;
  subscriptionPlan: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  checkoutAvailable: boolean;
  showPortal: boolean;
};

function towerEntitlementSourceLine(source: TowerEntitlement["source"]): string | null {
  switch (source) {
    case "user_stripe":
      return "Pro subscription on your account.";
    case "organization":
      return "Pro usage limits apply through your workspace Team subscription.";
    default:
      return null;
  }
}

function formatSubscriptionStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }
  return status.replaceAll("_", " ");
}

export function TowerBillingScreen(props: TowerBillingScreenProps) {
  const { email, entitlement, usageStatus, subscriptionPlan, subscriptionStatus, checkoutAvailable, showPortal } =
    props;

  const tierLabel = billingAccountPlanLabel(entitlement);
  const limitsDetail = usageLimitsKindDetailLine(usageStatus.limitsKind, entitlement.tier);
  const entitlementSource = towerEntitlementSourceLine(entitlement.source);
  const statusLabel = formatSubscriptionStatus(subscriptionStatus);
  const planDescriptionParts = [
    entitlementSource,
    limitsDetail,
    statusLabel ? `Subscription status: ${statusLabel}` : null,
    subscriptionPlan && subscriptionPlan !== entitlement.tier ? `Recorded plan: ${subscriptionPlan}` : null,
  ].filter((line): line is string => Boolean(line));

  const hasIndividualPro = entitlement.source === "user_stripe";
  const showUpgrade = entitlement.tier === "free" && checkoutAvailable;
  const showPlanActions = showUpgrade || (showPortal && hasIndividualPro);

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Billing & usage"
        description="Manage your plan and monthly usage limits."
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
          <CardTitle>Current plan</CardTitle>
          <CardDescription className="space-y-2">
            <span>
              You are on the <span className="font-medium text-foreground">{tierLabel}</span> plan.
            </span>
            <UsagePlanBadges
              tier={entitlement.tier}
              entitlementSource={entitlement.source}
              limitsKind={usageStatus.limitsKind}
            />
            {planDescriptionParts.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {planDescriptionParts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </CardDescription>
          {showPlanActions ? (
            <CardAction align="center" group>
              {showUpgrade ? (
                <form action="/api/billing/checkout" method="post">
                  <Button type="submit">Upgrade to Pro</Button>
                </form>
              ) : null}
              {showPortal ? (
                <Button asChild variant="outline">
                  <a href="/api/billing/portal">Manage subscription</a>
                </Button>
              ) : null}
            </CardAction>
          ) : null}
        </CardHeader>
      </Card>

      <TowerUsageSection
        status={usageStatus}
        entitlementSource={entitlement.source}
        title="This month"
        description="Your usage against plan limits this month."
      />
    </TowerPageMain>
  );
}
