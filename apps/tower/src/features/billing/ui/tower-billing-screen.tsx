import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { towerPlanName } from "@codalyn/webflow-kit";
import { IconBuilding, IconUser } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { INDIVIDUAL_PLAN_COPY } from "@/features/billing/lib/individual-plan-copy";
import {
  buildIndividualPlanOptions,
  type IndividualPlanOptionModel,
} from "@/features/billing/lib/individual-plan-options";
import { BillingPlanHero, BillingPlanHeroRow } from "@/features/billing/ui/billing-plan-hero";
import { BillingPlanOption, BillingPlanOptionsList } from "@/features/billing/ui/billing-plan-option";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { UsageBreakdownSection } from "@/features/billing/ui/usage-breakdown-section";
import { WorkspaceSeatUsageBlock } from "@/features/billing/ui/workspace-seat-usage-block";
import { WorkspaceManageSubscriptionButton } from "@/features/team/ui/workspace-manage-subscription-button";
import { WorkspaceTeamSubscribeUpsell } from "@/features/team/ui/workspace-team-checkout-form";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import type { IndividualPaidPlan } from "@/server/billing/stripe-subscription-status";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import type { WorkspaceUsageContributor } from "@/server/billing/workspace-usage-contributors";
import { formatCancelDate } from "@/shared/lib/billing/cancel-date";
import { usageLimitsKindBadgeLabel, usageLimitsKindDetailLine, usagePlanBadgeLabel } from "@/shared/lib/usage-display";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import {
  TowerCurrentWorkspaceMeta,
  TowerPageHeader,
  TowerPageMain,
  TowerPageSection,
} from "@/shared/ui/tower-page-shell";
import { UsageLimitsTable } from "@/shared/ui/usage-limits-table";

type TowerBillingScreenProps = {
  email: string | null | undefined;
  /** Active individual paid plan (Pro or Studio) on the `user` row, or null when on Free. */
  individualPlan: IndividualPaidPlan | null;
  entitlement: TowerEntitlement;
  usageStatus: TowerUsageStatusSnapshot;
  /** Individual subscription status from `user` row; omit when the user has no individual subscription. */
  individualSubscriptionStatus?: string | null;
  /** When the individual subscription is scheduled to cancel (from Stripe), or null. */
  individualCancelAt?: Date | null;
  checkoutAvailable: boolean;
  studioCheckoutAvailable: boolean;
  showIndividualPortal: boolean;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  workspaceBilling: WorkspaceBillingView | null;
  /** Per-member pool contributors for Team admins; null for individual scope or non-admins. */
  usageContributors: WorkspaceUsageContributor[] | null;
};

type BillingMetadataItem = {
  label: string;
  value: ReactNode;
};

function formatSubscriptionStatus(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }
  return status.replaceAll("_", " ");
}

function BillingCardTitle(props: { icon: ReactNode; title: string }) {
  const { icon, title } = props;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <CardTitle>{title}</CardTitle>
    </div>
  );
}

function BillingMetadataGrid(props: { items: BillingMetadataItem[] }) {
  const { items } = props;
  if (items.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IndividualPlanCheckoutButton(props: { plan: IndividualPaidPlan; variant?: "default" | "outline" }) {
  const { plan, variant = "default" } = props;
  return (
    <form action="/api/billing/checkout" method="post">
      <input type="hidden" name="plan" value={plan} />
      <Button type="submit" variant={variant}>
        Subscribe
      </Button>
    </form>
  );
}

function individualPlanCaption(planLabel: string, hasIndividualPlan: boolean, teamWorkspaceActive: boolean): string {
  if (!hasIndividualPlan) {
    return "Free limits apply on workspaces you own.";
  }
  if (teamWorkspaceActive) {
    return "Active on this account. Team workspace limits take precedence while that workspace is selected.";
  }
  return `${planLabel} limits apply on workspaces you own.`;
}

function IndividualSubscriptionActions(props: { showIndividualPortal: boolean }) {
  const { showIndividualPortal } = props;
  if (!showIndividualPortal) {
    return null;
  }
  return (
    <CardAction align="center" group>
      <Button asChild variant="outline">
        <a href="/api/billing/portal">Manage subscription</a>
      </Button>
    </CardAction>
  );
}

function IndividualPlanSwitchButton(props: { plan: IndividualPaidPlan; direction: "upgrade" | "downgrade" }) {
  const { plan, direction } = props;
  return (
    <Button asChild variant={direction === "upgrade" ? "default" : "outline"}>
      <a href={`/api/billing/portal?flow=switch&plan=${plan}`}>Switch to {towerPlanName(plan)}</a>
    </Button>
  );
}

function IndividualPlanCancelButton() {
  return (
    <Button asChild variant="ghost">
      <a href="/api/billing/portal?flow=cancel">Downgrade to Free</a>
    </Button>
  );
}

function individualPlanOptionAction(option: IndividualPlanOptionModel): ReactNode | undefined {
  const { action } = option;
  if (!action) {
    return undefined;
  }
  switch (action.kind) {
    case "subscribe":
      return (
        <IndividualPlanCheckoutButton plan={action.plan} variant={action.plan === "studio" ? "outline" : "default"} />
      );
    case "switch":
      return (
        <IndividualPlanSwitchButton
          plan={action.plan}
          direction={option.state === "upgrade" ? "upgrade" : "downgrade"}
        />
      );
    case "cancel":
      return <IndividualPlanCancelButton />;
  }
}

/** Free-row caption while on a paid plan: the cancel path, or the scheduled end of the plan. */
function freePlanDowngradeCaption(currentPlanLabel: string, cancelAtLabel: string | null): string {
  if (cancelAtLabel) {
    return `Your ${currentPlanLabel} plan ends on ${cancelAtLabel}. Free limits apply after that.`;
  }
  return `Cancel ${currentPlanLabel} to move to Free at the end of your billing period.`;
}

function IndividualSubscriptionCard(props: {
  individualPlan: IndividualPaidPlan | null;
  individualSubscriptionStatus?: string | null;
  individualCancelAt: Date | null;
  checkoutAvailable: boolean;
  studioCheckoutAvailable: boolean;
  showIndividualPortal: boolean;
  teamWorkspaceActive: boolean;
}) {
  const {
    individualPlan,
    individualSubscriptionStatus,
    individualCancelAt,
    checkoutAvailable,
    studioCheckoutAvailable,
    showIndividualPortal,
    teamWorkspaceActive,
  } = props;

  const hasIndividualPlan = individualPlan !== null;
  const currentPlanLabel = individualPlan ? towerPlanName(individualPlan) : "Free";
  const cancelAtLabel = hasIndividualPlan && individualCancelAt ? formatCancelDate(individualCancelAt) : null;
  const statusLine = hasIndividualPlan ? formatSubscriptionStatus(individualSubscriptionStatus) : null;
  const currentCaption = individualPlanCaption(currentPlanLabel, hasIndividualPlan, teamWorkspaceActive);
  const currentCaptionWithStatus = [
    currentCaption,
    statusLine ? `Status: ${statusLine}.` : null,
    cancelAtLabel ? `Cancels on ${cancelAtLabel}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const planOptions = buildIndividualPlanOptions({
    individualPlan,
    proCheckoutAvailable: checkoutAvailable,
    studioCheckoutAvailable,
    portalAvailable: showIndividualPortal,
    cancelPending: cancelAtLabel !== null,
  });

  const optionCaption = (option: IndividualPlanOptionModel): string => {
    if (option.state === "current") {
      return currentCaptionWithStatus;
    }
    if (option.key === "free") {
      return freePlanDowngradeCaption(currentPlanLabel, cancelAtLabel);
    }
    return INDIVIDUAL_PLAN_COPY[option.key].bestFor;
  };

  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconUser className="size-4" />} title="Individual subscription" />
        <IndividualSubscriptionActions showIndividualPortal={showIndividualPortal} />
      </CardHeader>
      <CardContent>
        <BillingPlanOptionsList>
          {planOptions.map((option) => (
            <BillingPlanOption
              key={option.key}
              plan={towerPlanName(option.key)}
              caption={optionCaption(option)}
              state={option.state}
              details={INDIVIDUAL_PLAN_COPY[option.key].details}
              action={individualPlanOptionAction(option)}
            />
          ))}
        </BillingPlanOptionsList>
      </CardContent>
    </Card>
  );
}

function NoActiveWorkspaceBillingCard() {
  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconBuilding className="size-4" />} title="Workspace subscription" />
      </CardHeader>
      <CardContent>
        <BillingPlanHero
          plan="Not selected"
          caption="Choose a workspace from the header to view its Team plan, seats, and usage limits."
        />
      </CardContent>
    </Card>
  );
}

/** Metadata rows for the workspace card; a pending cancellation replaces the raw status line. */
function workspaceSubscriptionMetadata(
  workspaceBilling: WorkspaceBillingView | null,
  cancelAt: Date | null
): BillingMetadataItem[] {
  if (cancelAt) {
    return [{ label: "Team plan canceled", value: `Active until ${formatCancelDate(cancelAt)}` }];
  }
  if (workspaceBilling?.isPaid && workspaceBilling.subscriptionStatus) {
    return [{ label: "Subscription status", value: formatSubscriptionStatus(workspaceBilling.subscriptionStatus) }];
  }
  return [];
}

function ActiveWorkspaceBillingDetails(props: {
  organizationId: string;
  activeOrganizationName: string | null;
  usageStatus: TowerUsageStatusSnapshot;
  workspaceBilling: WorkspaceBillingView | null;
}) {
  const { organizationId, activeOrganizationName, usageStatus, workspaceBilling } = props;
  const limitsDetail = usageLimitsKindDetailLine(usageStatus.limitsKind, usageStatus.tier);
  const limitsBadge = usageLimitsKindBadgeLabel(usageStatus.limitsKind, usageStatus.tier);
  const workspacePlanLabel = workspaceBilling?.isPaid ? "Team" : "Free";
  const workspacePlanCaption = workspaceBilling?.isPaid
    ? "Paid Team billing covers seats and Team usage limits for this workspace."
    : "Add Team billing for seats and Team limits.";
  const workspaceCancelAt = workspaceBilling?.isPaid ? (workspaceBilling.pendingCancelAt ?? null) : null;
  const metadata = workspaceSubscriptionMetadata(workspaceBilling, workspaceCancelAt);

  return (
    <CardContent className="space-y-4">
      <BillingPlanHeroRow
        plan={workspacePlanLabel}
        caption={workspacePlanCaption}
        trailing={<TowerCurrentWorkspaceMeta name={activeOrganizationName} />}
      />

      {metadata.length > 0 ? (
        <>
          <Separator />
          <BillingMetadataGrid items={metadata} />
        </>
      ) : null}

      {workspaceBilling?.billingEnabled ? (
        <>
          <Separator />
          <WorkspaceSeatUsageBlock usage={workspaceBilling} pendingCancellation={workspaceCancelAt !== null} />
        </>
      ) : null}

      <Separator />

      <UsageLimitsTable
        tierLabel={usagePlanBadgeLabel(usageStatus.tier)}
        limitsKind={usageStatus.limitsKind}
        limitsKindBadge={limitsBadge}
        limitsKindDetail={limitsDetail}
        meters={usageStatus.meters}
      />

      {workspaceBilling?.billingEnabled &&
      workspaceBilling.canManageBilling &&
      !workspaceBilling.isPaid &&
      workspaceBilling.teamCheckoutConfigured ? (
        <>
          <Separator />
          <WorkspaceTeamSubscribeUpsell
            organizationId={organizationId}
            seatFloor={workspaceBilling.checkoutSeatFloor}
            seatMax={workspaceBilling.checkoutSeatMax}
            seatPrice={workspaceBilling.teamSeatPrice}
          />
        </>
      ) : null}

      {workspaceBilling?.isOverSeatCap ? (
        <p className="text-sm text-destructive">
          Over seat limit ({workspaceBilling.seatsUsed}/{workspaceBilling.effectiveSeatLimit}). Open Team billing to
          resolve before inviting members.
        </p>
      ) : null}

      {workspaceBilling && !workspaceBilling.canManageBilling && workspaceBilling.billingEnabled ? (
        <p className="text-sm text-muted-foreground">Only workspace admins can change Team billing and seats.</p>
      ) : null}

      {workspaceBilling?.billingEnabled &&
      workspaceBilling.canManageBilling &&
      !workspaceBilling.isPaid &&
      workspaceBilling.hasStripeCustomer &&
      workspaceBilling.canManagePaidBilling ? (
        <p className="text-xs text-muted-foreground">
          Need invoices or a past subscription? Open the{" "}
          <WorkspaceManageSubscriptionButton organizationId={organizationId} variant="link" />.
        </p>
      ) : null}
    </CardContent>
  );
}

function WorkspaceSubscriptionCardAction(props: { organizationId: string; billing: WorkspaceBillingView | null }) {
  const { organizationId, billing } = props;

  if (
    !billing?.billingEnabled ||
    !billing.canManageBilling ||
    !billing.isPaid ||
    !billing.hasStripeCustomer ||
    !billing.canManagePaidBilling
  ) {
    return null;
  }

  return <WorkspaceManageSubscriptionButton organizationId={organizationId} />;
}

function ActiveWorkspaceBillingCard(props: {
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  usageStatus: TowerUsageStatusSnapshot;
  workspaceBilling: WorkspaceBillingView | null;
}) {
  const { activeOrganizationId, activeOrganizationName, usageStatus, workspaceBilling } = props;

  if (!activeOrganizationId) {
    return <NoActiveWorkspaceBillingCard />;
  }

  const showWorkspaceAction =
    workspaceBilling?.billingEnabled &&
    workspaceBilling.canManageBilling &&
    workspaceBilling.isPaid &&
    workspaceBilling.hasStripeCustomer &&
    workspaceBilling.canManagePaidBilling;

  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconBuilding className="size-4" />} title="Workspace subscription" />
        {showWorkspaceAction ? (
          <CardAction align="center" group>
            <WorkspaceSubscriptionCardAction organizationId={activeOrganizationId} billing={workspaceBilling} />
          </CardAction>
        ) : null}
      </CardHeader>
      <ActiveWorkspaceBillingDetails
        organizationId={activeOrganizationId}
        activeOrganizationName={activeOrganizationName}
        usageStatus={usageStatus}
        workspaceBilling={workspaceBilling}
      />
    </Card>
  );
}

export function TowerBillingScreen(props: TowerBillingScreenProps) {
  const {
    email,
    individualPlan,
    entitlement,
    usageStatus,
    checkoutAvailable,
    studioCheckoutAvailable,
    showIndividualPortal,
    individualSubscriptionStatus,
    individualCancelAt,
    activeOrganizationId,
    activeOrganizationName,
    workspaceBilling,
    usageContributors,
  } = props;

  const teamWorkspaceActive = entitlement.source === "workspace_team";

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Billing & usage"
        description="Personal Pro and workspace Team billing are billed separately. Usage follows your active workspace."
        meta={
          email ? (
            <span>
              Signed in as <span className="font-medium text-foreground">{email}</span>
            </span>
          ) : null
        }
      />

      <TowerPageSection
        title="Subscriptions"
        description="Your account plan and the Team plan for the selected workspace."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <IndividualSubscriptionCard
            individualPlan={individualPlan}
            individualSubscriptionStatus={individualSubscriptionStatus}
            individualCancelAt={individualCancelAt ?? null}
            checkoutAvailable={checkoutAvailable}
            studioCheckoutAvailable={studioCheckoutAvailable}
            showIndividualPortal={showIndividualPortal}
            teamWorkspaceActive={teamWorkspaceActive}
          />
          <ActiveWorkspaceBillingCard
            activeOrganizationId={activeOrganizationId}
            activeOrganizationName={activeOrganizationName}
            usageStatus={usageStatus}
            workspaceBilling={workspaceBilling}
          />
        </div>
      </TowerPageSection>

      <TowerPageSection
        title="This month"
        description={`Measured against ${usagePlanBadgeLabel(usageStatus.tier).toLowerCase()} limits for your active workspace.`}
      >
        <TowerUsageSection status={usageStatus} title={null} description={null} />
      </TowerPageSection>

      <UsageBreakdownSection status={usageStatus} contributors={usageContributors} />
    </TowerPageMain>
  );
}
