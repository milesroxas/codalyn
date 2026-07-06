import { IconCalendarX, IconCreditCard } from "@tabler/icons-react";
import { WorkspaceSeatUsageBlock } from "@/features/billing/ui/workspace-seat-usage-block";
import { WorkspaceManageSubscriptionButton } from "@/features/team/ui/workspace-manage-subscription-button";
import { WorkspaceTeamSubscribeUpsell } from "@/features/team/ui/workspace-team-checkout-form";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { formatCancelDate } from "@/shared/lib/billing/cancel-date";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

function WorkspaceBillingPlanStatus(props: { billing: WorkspaceBillingView }) {
  const { billing } = props;
  const planLabel = billing.isPaid ? (billing.billingPlan ?? "Team") : "Free";
  const pendingCancellation = billing.pendingCancelAt !== null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold capitalize text-foreground">{planLabel}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {billing.isPaid
            ? "Paid Team billing covers seats and Team usage limits for this workspace."
            : "Solo free workspace. Subscribe to Team to invite collaborators."}
        </p>
      </div>
      {billing.pendingCancelAt ? (
        <Alert variant="warning">
          <IconCalendarX aria-hidden />
          <AlertTitle>Team plan canceled — active until {formatCancelDate(billing.pendingCancelAt)}</AlertTitle>
          <AlertDescription>
            Seats and Team usage limits stay until then; after that the workspace returns to Free limits. Resume the
            plan anytime from Manage subscription.
          </AlertDescription>
        </Alert>
      ) : null}
      {billing.billingEnabled && billing.subscriptionStatus && !pendingCancellation ? (
        <p className="text-xs text-muted-foreground">
          Subscription status:{" "}
          <span className="font-mono text-foreground">{billing.subscriptionStatus.replaceAll("_", " ")}</span>
        </p>
      ) : null}
      <WorkspaceSeatUsageBlock usage={billing} pendingCancellation={pendingCancellation} />
    </div>
  );
}

function WorkspaceBillingActions(props: { organizationId: string; billing: WorkspaceBillingView }) {
  const { organizationId, billing } = props;

  if (!billing.billingEnabled) {
    return null;
  }

  if (!billing.canManageBilling) {
    return <p className="text-xs text-muted-foreground">Only workspace admins can manage billing.</p>;
  }

  const showCheckout = !billing.isPaid && billing.teamCheckoutConfigured;
  const showPaidPortal = billing.isPaid && billing.hasStripeCustomer && billing.canManagePaidBilling;
  const showLapsedPortalLink = !billing.isPaid && billing.hasStripeCustomer && billing.canManagePaidBilling;

  if (!(showCheckout || showPaidPortal || showLapsedPortalLink)) {
    if (!billing.teamCheckoutConfigured && !billing.isPaid) {
      return (
        <p className="text-xs text-muted-foreground">
          Team checkout is disabled until <code className="font-mono">STRIPE_PRICE_TEAM_SEAT</code> is configured.
        </p>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {showPaidPortal ? <WorkspaceManageSubscriptionButton organizationId={organizationId} /> : null}
      {showCheckout ? (
        <WorkspaceTeamSubscribeUpsell
          organizationId={organizationId}
          seatFloor={billing.checkoutSeatFloor}
          seatMax={billing.checkoutSeatMax}
          seatPrice={billing.teamSeatPrice}
        />
      ) : null}
      {showLapsedPortalLink ? (
        <p className="text-xs text-muted-foreground">
          Need invoices or a past subscription? Open the{" "}
          <WorkspaceManageSubscriptionButton organizationId={organizationId} variant="link" />.
        </p>
      ) : null}
      {billing.isPaid && !billing.canManagePaidBilling ? (
        <p className="text-xs text-muted-foreground">
          Only the billing owner (the admin who started this subscription) or the workspace owner can manage the
          subscription.
        </p>
      ) : null}
    </div>
  );
}

export function WorkspaceBillingSection(props: { organizationId: string; billing: WorkspaceBillingView }) {
  const { organizationId, billing } = props;
  const showActions =
    billing.billingEnabled &&
    (billing.canManageBilling ||
      (!billing.teamCheckoutConfigured && !billing.isPaid) ||
      (billing.isPaid && !billing.canManagePaidBilling));

  return (
    <Card size="sm" className="@container/billing-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconCreditCard className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Workspace seats</CardTitle>
        </div>
        <CardDescription>Manage seats and subscription for this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            showActions
              ? "flex flex-col gap-4 @[40rem]/billing-card:grid @[40rem]/billing-card:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] @[40rem]/billing-card:items-start @[40rem]/billing-card:gap-8"
              : "space-y-4"
          )}
        >
          <div className="space-y-4">
            <WorkspaceBillingPlanStatus billing={billing} />

            {billing.isOverSeatCap ? (
              <p className="text-sm text-destructive">
                Over seat limit ({billing.seatsUsed}/{billing.effectiveSeatLimit}). Remove members or resubscribe before
                inviting.
              </p>
            ) : null}
          </div>

          {showActions ? (
            <div className="border-t border-border pt-4 @[40rem]/billing-card:border-t-0 @[40rem]/billing-card:pt-0">
              <WorkspaceBillingActions organizationId={organizationId} billing={billing} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
