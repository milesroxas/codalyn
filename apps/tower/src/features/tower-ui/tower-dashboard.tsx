import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { IconCreditCard, IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { formatWebflowIntegrationStatus } from "@/features/tower-ui/lib/tower-webflow-integration-status";
import { TowerWorkspaceOnboardingBanner } from "@/features/tower-ui/tower-workspace-onboarding-banner";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";
import { ActionTile, ActionTileGrid } from "@/shared/ui/action-tile";
import { Button } from "@/shared/ui/button";
import { StatTile } from "@/shared/ui/stat-tile";
import {
  TowerDashboardGrid,
  TowerDashboardSignals,
  TowerPageHeader,
  TowerPageMain,
  TowerPageSection,
} from "@/shared/ui/tower-page-shell";
import { UsageApproachingLimitAlert } from "@/shared/ui/usage-approaching-limit-alert";

type TowerDashboardProps = {
  summary: TowerDashboardSummary;
  usage: TowerUsageStatusSnapshot;
  billingEnabled: boolean;
  oauthConfigured: boolean;
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
    description: string;
    href: string;
    icon: typeof IconPlug;
    variant?: "default" | "emphasis";
  }> = [];

  if (!summary.webflowOAuthConnected) {
    actions.push({
      key: "connect-webflow",
      label: summary.activeOrgTeamAdmin ? "Connect Webflow" : "Webflow settings",
      description: "Connect Webflow to enable the Data API proxy.",
      href: TOWER_CONNECTION_PATH,
      icon: IconPlug,
      variant: "emphasis",
    });
  }

  actions.push({
    key: "team",
    label: summary.activeOrgTeamAdmin ? "Manage team" : "View team",
    description: "Invite members and manage roles.",
    href: "/team",
    icon: IconUsers,
  });
  actions.push({
    key: "beacon",
    label: "Beacon presets",
    description: "Manage image presets for Beacon.",
    href: "/beacon",
    icon: IconRadar2,
  });

  if (billingEnabled) {
    actions.push({
      key: "billing",
      label: "Billing",
      description: "View plan, usage, and subscription.",
      href: "/billing",
      icon: IconCreditCard,
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

function DashboardSignalsColumn({ summary }: { summary: TowerDashboardSummary }) {
  return (
    <TowerDashboardSignals>
      <StatTile
        label="Webflow"
        {...formatWebflowIntegrationStatus({
          webflowOAuthConnected: summary.webflowOAuthConnected,
          webflowSitesCount: summary.webflowSites ? summary.webflowSites.length : null,
        })}
        icon={IconPlug}
        href={TOWER_CONNECTION_PATH}
      />
      <StatTile label="Team" {...teamSnapshot(summary)} icon={IconUsers} href="/team" />
      <StatTile label="Beacon presets" {...beaconSnapshot(summary)} icon={IconRadar2} href="/beacon" />
    </TowerDashboardSignals>
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
      <ActionTileGrid>
        {quickActions.map((action) => (
          <ActionTile
            key={action.key}
            label={action.label}
            description={action.description}
            icon={action.icon}
            href={action.href}
            variant={action.variant}
          />
        ))}
      </ActionTileGrid>
    </TowerPageSection>
  );
}

export function TowerDashboard({ summary, usage, billingEnabled, oauthConfigured }: TowerDashboardProps) {
  const approachingMeters = usage.approachingMeters.flatMap((meter) =>
    meter.limit === null ? [] : [{ kind: meter.kind, used: meter.used, limit: meter.limit }]
  );

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Dashboard"
        description="Workspace status, integrations, and usage at a glance."
        actions={
          summary.activeOrgTeamAdmin || !summary.webflowOAuthConnected ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={TOWER_CONNECTION_PATH}>
                {summary.webflowOAuthConnected ? "Manage Webflow" : "Connect Webflow"}
              </Link>
            </Button>
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

      <TowerWorkspaceOnboardingBanner
        summary={summary}
        billingEnabled={billingEnabled}
        oauthConfigured={oauthConfigured}
        includeWebflowConnect
      />

      <TowerDashboardGrid>
        <DashboardSignalsColumn summary={summary} />
        <TowerUsageSection
          status={usage}
          billingEnabled={billingEnabled}
          showBillingLink
          fillHeight
          title="Usage this month"
          description="Proxy traffic, CMS writes, and image processing."
        />
      </TowerDashboardGrid>

      <DashboardQuickActions summary={summary} billingEnabled={billingEnabled} />
    </TowerPageMain>
  );
}
