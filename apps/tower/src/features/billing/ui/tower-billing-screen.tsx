import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
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

export function TowerBillingScreen(props: TowerBillingScreenProps) {
  const { email, entitlement, usageStatus, subscriptionPlan, subscriptionStatus, checkoutAvailable, showPortal } =
    props;

  const tierLabel = entitlement.tier === "pro" ? "Pro" : "Free";
  const planDescription = [
    `Source: ${entitlement.source}.`,
    `Tier: ${tierLabel}`,
    subscriptionStatus ? ` (${subscriptionStatus})` : null,
    subscriptionPlan && subscriptionPlan !== entitlement.tier ? ` · Plan: ${subscriptionPlan}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Billing & usage"
        description="Manage your Pro plan and monthly usage limits."
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
          <CardDescription>{planDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {checkoutAvailable && entitlement.tier === "free" ? (
            <form action="/api/billing/checkout" method="post">
              <Button type="submit">Upgrade to Pro</Button>
            </form>
          ) : null}
          {checkoutAvailable && showPortal ? (
            <Button asChild variant="outline">
              <a href="/api/billing/portal">Manage subscription</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <TowerUsageSection
        status={usageStatus}
        title="This month"
        description="Your usage against plan limits this month."
      />

      {!checkoutAvailable ? (
        <p className="mt-8 text-xs text-muted-foreground">
          Checkout is disabled until you set <code className="font-mono">STRIPE_SECRET_KEY</code> and{" "}
          <code className="font-mono">STRIPE_PRICE_PRO</code> in the environment and run{" "}
          <code className="font-mono">stripe listen</code> for local webhooks.
        </p>
      ) : null}
    </TowerPageMain>
  );
}
