import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { IconCreditCard, IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { formatWebflowIntegrationStatus } from "@/features/tower-ui/lib/tower-webflow-integration-status";
import { shouldShowPageHeaderWebflowAction } from "@/features/tower-ui/lib/tower-workspace-onboarding";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";
import { ActionTile, ActionTileGrid } from "@/shared/ui/action-tile";
import { Button } from "@/shared/ui/button";
import { StatTile, type StatTileTone, type StatTileValueVariant } from "@/shared/ui/stat-tile";
import {
  TowerDashboardGrid,
  TowerDashboardSignals,
  TowerPageHeader,
  TowerPageMain,
  TowerPageSection,
} from "@/shared/ui/tower-page-shell";

type TowerDashboardProps = {
  summary: TowerDashboardSummary;
  usage: TowerUsageStatusSnapshot;
  billingEnabled: boolean;
};

type DashboardStatSnapshot = {
  value: string;
  valueVariant: StatTileValueVariant;
  detail?: string;
  caption?: string;
  tone: StatTileTone;
};

function teamSnapshot(summary: TowerDashboardSummary): DashboardStatSnapshot {
  if (!summary.activeOrganizationId) {
    return {
      value: "—",
      valueVariant: "status",
      caption: "No workspace selected",
      tone: "default",
    };
  }

  const members = summary.workspaceMemberCount ?? 0;
  const pending = summary.workspacePendingInviteCount ?? 0;
  const value = `${members} ${members === 1 ? "member" : "members"}`;

  return {
    value,
    valueVariant: "metric",
    detail: pending > 0 ? `${pending} pending ${pending === 1 ? "invite" : "invites"}` : undefined,
    caption: pending > 0 ? "People invited to this workspace." : "People with access to this workspace.",
    tone: "default",
  };
}

function imagePresetsSnapshot(summary: TowerDashboardSummary): DashboardStatSnapshot {
  if (!summary.activeOrganizationId) {
    return {
      value: "—",
      valueVariant: "status",
      caption: "No workspace selected",
      tone: "default",
    };
  }

  const count = summary.beaconPresetCount ?? 0;
  if (count === 0) {
    return {
      value: "No presets set",
      valueVariant: "status",
      caption: "Default settings for Webflow image uploads.",
      tone: "default",
    };
  }

  return {
    value: `${count} ${count === 1 ? "preset" : "presets"}`,
    valueVariant: "metric",
    caption: "Reusable settings for Webflow image uploads.",
    tone: "positive",
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
      <StatTile label="Image presets" {...imagePresetsSnapshot(summary)} icon={IconRadar2} href="/beacon" />
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

export function TowerDashboard({ summary, usage, billingEnabled }: TowerDashboardProps) {
  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Dashboard"
        description="Monitor workspace usage, connection status, and account activity."
        actions={
          shouldShowPageHeaderWebflowAction(summary) ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={TOWER_CONNECTION_PATH}>
                {summary.webflowOAuthConnected ? "Manage Webflow" : "Connect Webflow"}
              </Link>
            </Button>
          ) : null
        }
        meta={<DashboardHeaderMeta summary={summary} />}
      />

      <TowerDashboardGrid>
        <DashboardSignalsColumn summary={summary} />
        <TowerUsageSection
          status={usage}
          billingEnabled={billingEnabled}
          showBillingLink
          canManageWorkspaceBilling={summary.activeOrgTeamAdmin}
          fillHeight
          title="Usage this month"
        />
      </TowerDashboardGrid>

      <DashboardQuickActions summary={summary} billingEnabled={billingEnabled} />
    </TowerPageMain>
  );
}
