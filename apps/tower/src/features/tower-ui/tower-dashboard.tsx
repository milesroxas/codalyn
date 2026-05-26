import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { IconGauge, IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { BeaconDashboardActivity } from "@/features/beacon/ui/beacon-dashboard-activity";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { formatTowerDashboardUsageSnapshot } from "@/features/tower-ui/tower-dashboard-usage-snapshot";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatTile } from "@/shared/ui/stat-tile";
import { TowerPageHeader, TowerPageMain, TowerPageSection } from "@/shared/ui/tower-page-shell";
import { UsageApproachingLimitAlert } from "@/shared/ui/usage-approaching-limit-alert";

type TowerDashboardProps = {
  summary: TowerDashboardSummary;
  usage: TowerUsageStatusSnapshot;
  billingEnabled: boolean;
};

function teamSnapshot(summary: TowerDashboardSummary) {
  if (!summary.activeOrganizationId) {
    return { value: "—", hint: "No workspace selected", tone: "default" as const };
  }

  const members = summary.workspaceMemberCount ?? 0;
  const pending = summary.workspacePendingInviteCount ?? 0;
  const memberWord = members === 1 ? "member" : "members";
  const hint = summary.activeOrgTeamAdmin && pending > 0 ? `${memberWord} · ${pending} pending` : memberWord;

  return { value: members, hint, tone: "default" as const };
}

function webflowSnapshot(summary: TowerDashboardSummary) {
  if (!summary.webflowOAuthConnected) {
    return { value: "Not connected", hint: "Data API proxy off", tone: "warn" as const };
  }

  const siteCount = summary.webflowSites?.length ?? 0;
  return {
    value: "Connected",
    hint: siteCount === 0 ? "No sites returned" : `${siteCount} site${siteCount === 1 ? "" : "s"} available`,
    tone: "positive" as const,
  };
}

function beaconSnapshot(summary: TowerDashboardSummary) {
  if (!summary.activeOrganizationId) {
    return { value: "—", hint: "No workspace selected", tone: "default" as const };
  }

  const count = summary.beaconPresetCount ?? 0;
  return {
    value: count,
    hint: count === 0 ? "Add in Beacon or Tower" : "Synced from workspace",
    tone: count === 0 ? ("default" as const) : ("positive" as const),
  };
}

function buildQuickActions(summary: TowerDashboardSummary, billingEnabled: boolean) {
  const actions: Array<{
    key: string;
    label: string;
    href: string | null;
    action: "link" | "webflow-oauth";
  }> = [];

  if (summary.activeOrgTeamAdmin && !summary.webflowOAuthConnected) {
    actions.push({
      key: "connect-webflow",
      label: "Connect Webflow",
      href: null,
      action: "webflow-oauth",
    });
  }

  actions.push({
    key: "team",
    label: summary.activeOrgTeamAdmin ? "Manage team" : "View team",
    href: "/team",
    action: "link",
  });
  actions.push({
    key: "beacon",
    label: "Beacon presets",
    href: "/beacon",
    action: "link",
  });

  if (billingEnabled) {
    actions.push({
      key: "billing",
      label: "Billing",
      href: "/billing",
      action: "link",
    });
  }

  return actions;
}

function DashboardHeaderMeta({ summary }: { summary: TowerDashboardSummary }) {
  return (
    <>
      {summary.userEmail ? <span className="font-medium text-foreground">{summary.userEmail}</span> : null}
      {summary.activeOrganizationName ? (
        <>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <span>
            Workspace <span className="font-medium text-foreground">{summary.activeOrganizationName}</span>
          </span>
        </>
      ) : summary.activeOrganizationId ? (
        <>
          <span className="hidden sm:inline" aria-hidden>
            ·
          </span>
          <span>No active workspace selected</span>
        </>
      ) : null}
    </>
  );
}

function DashboardOverviewSection({
  summary,
  usage,
  billingEnabled,
}: {
  summary: TowerDashboardSummary;
  usage: TowerUsageStatusSnapshot;
  billingEnabled: boolean;
}) {
  const usageSnapshot = formatTowerDashboardUsageSnapshot(usage);

  return (
    <TowerPageSection title="Overview" description="Key signals for the active workspace.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Webflow" {...webflowSnapshot(summary)} icon={IconPlug} />
        <StatTile label="Team" {...teamSnapshot(summary)} icon={IconUsers} href="/team" />
        <StatTile label="Beacon presets" {...beaconSnapshot(summary)} icon={IconRadar2} href="/beacon" />
        <StatTile
          label="Monthly usage"
          {...usageSnapshot}
          icon={IconGauge}
          href={billingEnabled ? "/billing" : undefined}
        />
      </div>
    </TowerPageSection>
  );
}

function DashboardQuickActions({
  summary,
  billingEnabled,
}: {
  summary: TowerDashboardSummary;
  billingEnabled: boolean;
}) {
  const quickActions = buildQuickActions(summary, billingEnabled);

  return (
    <TowerPageSection title="Quick actions" description="Common tasks based on your current setup.">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) =>
          action.action === "webflow-oauth" ? (
            <TowerWebflowOAuthPopupButton key={action.key} variant="outline" size="sm">
              {action.label}
            </TowerWebflowOAuthPopupButton>
          ) : (
            <Button key={action.key} variant="outline" size="sm" asChild>
              <Link href={action.href ?? "/"}>{action.label}</Link>
            </Button>
          )
        )}
      </div>
    </TowerPageSection>
  );
}

function DashboardDetailsSection({
  usage,
  billingEnabled,
}: {
  usage: TowerUsageStatusSnapshot;
  billingEnabled: boolean;
}) {
  return (
    <TowerPageSection title="Details" description="Deeper views when you need more than the snapshot.">
      <div className="grid gap-4 lg:grid-cols-2">
        <TowerUsageSection
          status={usage}
          billingEnabled={billingEnabled}
          showBillingLink
          title="This month"
          description="Monthly allowances for Webflow proxy traffic, CMS writes, and AVIF image processing."
        />
        <BeaconDashboardActivity />
      </div>
    </TowerPageSection>
  );
}

function DashboardWebflowSitesSection({ summary }: { summary: TowerDashboardSummary }) {
  const sites = summary.webflowSites ?? [];
  if (!summary.webflowOAuthConnected || sites.length === 0) {
    return null;
  }

  return (
    <TowerPageSection title="Webflow sites" description="Sites available to the Data API proxy for this account.">
      <Card>
        <CardHeader>
          <CardTitle>Authorized sites</CardTitle>
          <CardDescription>
            {sites.length} site{sites.length === 1 ? "" : "s"} returned from Webflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="max-h-40 space-y-1 overflow-auto text-xs">
            {sites.slice(0, 12).map((site) => (
              <li key={site.id} className="truncate font-mono text-muted-foreground">
                {site.displayName ?? site.id}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </TowerPageSection>
  );
}

export function TowerDashboard({ summary, usage, billingEnabled }: TowerDashboardProps) {
  const approachingMeters = usage.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Dashboard"
        description="At-a-glance status for your workspace, integrations, and monthly usage."
        actions={
          summary.activeOrgTeamAdmin ? (
            <TowerWebflowOAuthPopupButton variant="outline" size="sm">
              {summary.webflowOAuthConnected ? "Relink Webflow" : "Connect Webflow"}
            </TowerWebflowOAuthPopupButton>
          ) : null
        }
        meta={<DashboardHeaderMeta summary={summary} />}
      />

      {approachingMeters.length > 0 ? (
        <div className="mb-8">
          <UsageApproachingLimitAlert
            meters={approachingMeters}
            upgradeAction={
              billingEnabled && usage.tier === "free" ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/billing">Upgrade plan</Link>
                </Button>
              ) : null
            }
          />
        </div>
      ) : null}

      <DashboardOverviewSection summary={summary} usage={usage} billingEnabled={billingEnabled} />
      <DashboardQuickActions summary={summary} billingEnabled={billingEnabled} />
      <DashboardDetailsSection usage={usage} billingEnabled={billingEnabled} />
      <DashboardWebflowSitesSection summary={summary} />
    </TowerPageMain>
  );
}
