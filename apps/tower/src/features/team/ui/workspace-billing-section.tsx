import { IconCreditCard } from "@tabler/icons-react";
import { WorkspaceTeamCheckoutForm } from "@/features/team/ui/workspace-team-checkout-form";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

function WorkspaceBillingActions(props: { organizationId: string; billing: WorkspaceBillingView }) {
  const { organizationId, billing } = props;

  if (!billing.billingEnabled || !billing.canManageBilling) {
    if (billing.billingEnabled) {
      return <p className="text-xs text-muted-foreground">Only workspace admins can manage billing.</p>;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!billing.isPaid && billing.teamCheckoutConfigured && !billing.isOverSeatCap ? (
          <WorkspaceTeamCheckoutForm organizationId={organizationId} />
        ) : null}
        {billing.hasStripeCustomer ? (
          <Button asChild variant="outline">
            <a href={`/api/billing/workspace/portal?organizationId=${encodeURIComponent(organizationId)}`}>
              Manage subscription
            </a>
          </Button>
        ) : null}
      </div>
      {!billing.teamCheckoutConfigured && !billing.isPaid ? (
        <p className="text-xs text-muted-foreground">
          Team checkout is disabled until <code className="font-mono">STRIPE_PRICE_TEAM_SEAT</code> is configured.
        </p>
      ) : null}
    </div>
  );
}

export function WorkspaceBillingSection(props: { organizationId: string; billing: WorkspaceBillingView }) {
  const { organizationId, billing } = props;
  const seatLabel = `${billing.seatsUsed} of ${billing.effectiveSeatLimit} seat${billing.effectiveSeatLimit === 1 ? "" : "s"} used`;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconCreditCard className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Workspace seats</CardTitle>
        </div>
        <CardDescription>Manage seats and subscription for this workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {billing.billingEnabled ? (
            <span>
              Plan:{" "}
              <span className="font-medium capitalize">
                {billing.isPaid ? (billing.billingPlan ?? "team") : "free"}
              </span>
            </span>
          ) : null}
          <span className="text-muted-foreground">{seatLabel}</span>
          {billing.billingEnabled && billing.subscriptionStatus ? (
            <span className="text-muted-foreground">
              Status: <span className="font-mono text-xs">{billing.subscriptionStatus}</span>
            </span>
          ) : null}
        </div>

        {billing.isOverSeatCap ? (
          <p className="text-sm text-destructive">
            Over seat limit ({billing.seatsUsed}/{billing.effectiveSeatLimit}). Remove members or resubscribe before
            inviting.
          </p>
        ) : null}

        <WorkspaceBillingActions organizationId={organizationId} billing={billing} />
      </CardContent>
    </Card>
  );
}
