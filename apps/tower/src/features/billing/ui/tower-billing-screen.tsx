import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { towerPlanName } from "@codalyn/webflow-kit";
import { IconBuilding, IconExternalLink, IconUser } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { UsageBreakdownSection } from "@/features/billing/ui/usage-breakdown-section";
import { WorkspaceSeatUsageBlock } from "@/features/billing/ui/workspace-seat-usage-block";
import { WorkspaceTeamCheckoutForm } from "@/features/team/ui/workspace-team-checkout-form";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import type { IndividualPaidPlan } from "@/server/billing/stripe-subscription-status";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import type { WorkspaceUsageContributor } from "@/server/billing/workspace-usage-contributors";
import { usageLimitsKindBadgeLabel, usageLimitsKindDetailLine, usagePlanBadgeLabel } from "@/shared/lib/usage-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
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

function billingPlanTone(plan: string): "default" | "positive" {
  return plan === "Free" || plan === "Not selected" ? "default" : "positive";
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

function BillingPlanHero(props: { plan: string; caption: string }) {
  const { plan, caption } = props;
  const tone = billingPlanTone(plan);

  return (
    <div className="space-y-1">
      <p
        className={cn("text-xl font-semibold tracking-tight", tone === "positive" ? "text-primary" : "text-foreground")}
      >
        {plan}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
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
        Subscribe to {towerPlanName(plan)}
      </Button>
    </form>
  );
}

function individualPlanCaption(planLabel: string, hasIndividualPlan: boolean, teamWorkspaceActive: boolean): string {
  if (!hasIndividualPlan) {
    return "Higher limits on workspaces you own, plus the ability to create additional workspaces.";
  }
  if (teamWorkspaceActive) {
    return "Active on this account. Team workspace limits take precedence while that workspace is selected.";
  }
  return `${planLabel} limits apply on workspaces you own.`;
}

function IndividualSubscriptionActions(props: {
  showUpgrade: boolean;
  checkoutAvailable: boolean;
  studioCheckoutAvailable: boolean;
  showIndividualPortal: boolean;
}) {
  const { showUpgrade, checkoutAvailable, studioCheckoutAvailable, showIndividualPortal } = props;
  if (!(showUpgrade || showIndividualPortal)) {
    return null;
  }
  return (
    <CardAction align="center" group>
      {showUpgrade && checkoutAvailable ? <IndividualPlanCheckoutButton plan="pro" /> : null}
      {showUpgrade && studioCheckoutAvailable ? <IndividualPlanCheckoutButton plan="studio" variant="outline" /> : null}
      {showIndividualPortal ? (
        <Button asChild variant="outline">
          <a href="/api/billing/portal">Manage subscription</a>
        </Button>
      ) : null}
    </CardAction>
  );
}

function IndividualSubscriptionCard(props: {
  individualPlan: IndividualPaidPlan | null;
  individualSubscriptionStatus?: string | null;
  checkoutAvailable: boolean;
  studioCheckoutAvailable: boolean;
  showIndividualPortal: boolean;
  teamWorkspaceActive: boolean;
}) {
  const {
    individualPlan,
    individualSubscriptionStatus,
    checkoutAvailable,
    studioCheckoutAvailable,
    showIndividualPortal,
    teamWorkspaceActive,
  } = props;

  const hasIndividualPlan = individualPlan !== null;
  const planLabel = individualPlan ? towerPlanName(individualPlan) : "Free";
  const statusLine = hasIndividualPlan ? formatSubscriptionStatus(individualSubscriptionStatus) : null;
  const showUpgrade = !hasIndividualPlan && (checkoutAvailable || studioCheckoutAvailable);
  const metadata: BillingMetadataItem[] = statusLine ? [{ label: "Subscription status", value: statusLine }] : [];

  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconUser className="size-4" />} title="Individual subscription" />
        <CardDescription>Personal Pro or Studio billing on your Codalyn account.</CardDescription>
        <IndividualSubscriptionActions
          showUpgrade={showUpgrade}
          checkoutAvailable={checkoutAvailable}
          studioCheckoutAvailable={studioCheckoutAvailable}
          showIndividualPortal={showIndividualPortal}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <BillingPlanHero
          plan={planLabel}
          caption={individualPlanCaption(planLabel, hasIndividualPlan, teamWorkspaceActive)}
        />
        {metadata.length > 0 ? (
          <>
            <Separator />
            <BillingMetadataGrid items={metadata} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NoActiveWorkspaceBillingCard() {
  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconBuilding className="size-4" />} title="Workspace subscription" />
        <CardDescription>Team billing and seats for the workspace selected in the header.</CardDescription>
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

function ActiveWorkspaceBillingDetails(props: {
  usageStatus: TowerUsageStatusSnapshot;
  workspaceBilling: WorkspaceBillingView | null;
}) {
  const { usageStatus, workspaceBilling } = props;
  const limitsDetail = usageLimitsKindDetailLine(usageStatus.limitsKind, usageStatus.tier);
  const limitsBadge = usageLimitsKindBadgeLabel(usageStatus.limitsKind, usageStatus.tier);
  const workspacePlanLabel = workspaceBilling?.isPaid ? "Team" : "Free";
  const workspacePlanCaption = workspaceBilling?.isPaid
    ? "Paid Team billing covers seats and Team usage limits for this workspace."
    : "Free workspace. Add Team billing for seats and Team limits.";
  const subscriptionStatus = workspaceBilling?.subscriptionStatus
    ? formatSubscriptionStatus(workspaceBilling.subscriptionStatus)
    : null;

  const metadata: BillingMetadataItem[] = [
    ...(subscriptionStatus ? [{ label: "Subscription status", value: subscriptionStatus }] : []),
  ];

  return (
    <CardContent className="space-y-4">
      <BillingPlanHero plan={workspacePlanLabel} caption={workspacePlanCaption} />

      {metadata.length > 0 ? (
        <>
          <Separator />
          <BillingMetadataGrid items={metadata} />
        </>
      ) : null}

      {workspaceBilling?.billingEnabled ? (
        <>
          <Separator />
          <WorkspaceSeatUsageBlock usage={workspaceBilling} />
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

      {workspaceBilling?.isOverSeatCap ? (
        <p className="text-sm text-destructive">
          Over seat limit ({workspaceBilling.seatsUsed}/{workspaceBilling.effectiveSeatLimit}). Open Team billing to
          resolve before inviting members.
        </p>
      ) : null}

      {workspaceBilling && !workspaceBilling.canManageBilling && workspaceBilling.billingEnabled ? (
        <p className="text-sm text-muted-foreground">Only workspace admins can change Team billing and seats.</p>
      ) : null}
    </CardContent>
  );
}

function WorkspaceSubscriptionCardAction(props: { organizationId: string; billing: WorkspaceBillingView | null }) {
  const { organizationId, billing } = props;

  if (!billing?.billingEnabled || !billing.canManageBilling) {
    return null;
  }

  if (billing.hasStripeCustomer) {
    return (
      <Button asChild variant="outline">
        <a href={`/api/billing/workspace/portal?organizationId=${encodeURIComponent(organizationId)}`}>
          Manage subscription
          <IconExternalLink aria-hidden data-icon="inline-end" stroke={1.75} />
        </a>
      </Button>
    );
  }

  if (!billing.isPaid && billing.teamCheckoutConfigured && !billing.isOverSeatCap) {
    return <WorkspaceTeamCheckoutForm organizationId={organizationId} />;
  }

  return null;
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

  const workspaceDescription = activeOrganizationName
    ? `Team billing and seats for ${activeOrganizationName}.`
    : "Team billing and seats for your selected workspace.";
  const showWorkspaceAction =
    workspaceBilling?.billingEnabled &&
    workspaceBilling.canManageBilling &&
    (workspaceBilling.hasStripeCustomer ||
      (!workspaceBilling.isPaid && workspaceBilling.teamCheckoutConfigured && !workspaceBilling.isOverSeatCap));

  return (
    <Card>
      <CardHeader>
        <BillingCardTitle icon={<IconBuilding className="size-4" />} title="Workspace subscription" />
        <CardDescription>{workspaceDescription}</CardDescription>
        {showWorkspaceAction ? (
          <CardAction align="center" group>
            <WorkspaceSubscriptionCardAction organizationId={activeOrganizationId} billing={workspaceBilling} />
          </CardAction>
        ) : null}
      </CardHeader>
      <ActiveWorkspaceBillingDetails usageStatus={usageStatus} workspaceBilling={workspaceBilling} />
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
        context={<TowerCurrentWorkspaceMeta name={activeOrganizationName} />}
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
