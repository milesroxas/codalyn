import { IconCreditCard } from "@tabler/icons-react";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function WorkspaceBillingSection(props: { organizationId: string; billing: WorkspaceBillingView }) {
  const { organizationId, billing } = props;

  if (!billing.billingEnabled) {
    return null;
  }

  const seatLabel = `${billing.seatsUsed} of ${billing.effectiveSeatLimit} seat${billing.effectiveSeatLimit === 1 ? "" : "s"} used`;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconCreditCard className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Team billing</CardTitle>
        </div>
        <CardDescription>
          Per-seat workspace plan — Pro limits for every member, shared Webflow connection, and team presets. Unpaid
          workspaces are solo (1 seat); subscribe to invite collaborators.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            Plan:{" "}
            <span className="font-medium capitalize">{billing.isPaid ? (billing.billingPlan ?? "team") : "free"}</span>
          </span>
          <span className="text-muted-foreground">{seatLabel}</span>
          {billing.subscriptionStatus ? (
            <span className="text-muted-foreground">
              Status: <span className="font-mono text-xs">{billing.subscriptionStatus}</span>
            </span>
          ) : null}
        </div>

        {billing.canManageBilling ? (
          <div className="flex flex-wrap gap-2">
            {!billing.isPaid && billing.teamCheckoutConfigured ? (
              <form action="/api/billing/workspace/checkout" method="post">
                <input type="hidden" name="organizationId" value={organizationId} />
                <Button type="submit">Subscribe to Team</Button>
              </form>
            ) : null}
            {billing.hasStripeCustomer ? (
              <Button asChild variant="outline">
                <a href={`/api/billing/workspace/portal?organizationId=${encodeURIComponent(organizationId)}`}>
                  Manage subscription
                </a>
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only workspace admins can manage billing.</p>
        )}

        {!billing.teamCheckoutConfigured && billing.canManageBilling && !billing.isPaid ? (
          <p className="text-xs text-muted-foreground">
            Team checkout is disabled until <code className="font-mono">STRIPE_PRICE_TEAM_SEAT</code> is configured.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
