"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { toast } from "sonner";
import {
  disconnectWebflowIntegration,
  WebflowIntegrationApiError,
} from "@/features/tower-ui/api/disconnect-webflow-integration";
import { formatWebflowIntegrationStatus } from "@/features/tower-ui/lib/tower-webflow-integration-status";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import { TowerWebflowSetupAlerts } from "@/features/tower-ui/tower-workspace-onboarding-banner";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import type { WebflowSiteSummary } from "@/server/webflow-sites";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TowerPageHeader, TowerPageMain, TowerPageSection } from "@/shared/ui/tower-page-shell";
import { DangerZoneTypedDelete } from "@/shared/ui/typed-confirm-alert-dialog";

type TowerWebflowScreenProps = {
  summary: TowerDashboardSummary;
  oauthConfigured: boolean;
  billingEnabled: boolean;
};

type WebflowScreenContext = {
  summary: TowerDashboardSummary;
  oauthConfigured: boolean;
  canManage: boolean;
  sites: WebflowSiteSummary[];
  onRefresh: () => void;
};

function WebflowSitesTable({ sites }: { sites: WebflowSiteSummary[] }) {
  if (sites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No sites returned</CardTitle>
          <CardDescription>Connected, but no sites found. Relink if access changed recently.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorized sites</CardTitle>
        <CardDescription>
          {sites.length} site{sites.length === 1 ? "" : "s"} available through Tower.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Site ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>{site.displayName ?? "Untitled site"}</TableCell>
                <TableCell>
                  <code>{site.id}</code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function WebflowConnectionSection({ summary, sites }: Pick<WebflowScreenContext, "summary" | "sites">) {
  const status = formatWebflowIntegrationStatus({
    webflowOAuthConnected: summary.webflowOAuthConnected,
    webflowSitesCount: sites.length,
  });

  return (
    <TowerPageSection title="Connection" description="OAuth status for the active workspace.">
      <Card>
        <CardHeader>
          <CardTitle>Data API proxy</CardTitle>
          <CardDescription>
            {summary.webflowOAuthConnected
              ? "This workspace can call the Webflow Data API through Tower."
              : "Connect Webflow to enable the Data API proxy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={summary.webflowOAuthConnected ? "default" : "secondary"}>{status.value}</Badge>
            <span className="text-sm text-muted-foreground">{status.caption}</span>
          </div>
        </CardContent>
      </Card>
    </TowerPageSection>
  );
}

function WebflowSitesSection({ summary, oauthConfigured, canManage, sites, onRefresh }: WebflowScreenContext) {
  if (!summary.webflowOAuthConnected) {
    return null;
  }

  return (
    <TowerPageSection
      title="Sites"
      description="Webflow sites available to this workspace."
      actions={
        canManage && oauthConfigured ? (
          <TowerWebflowOAuthPopupButton variant="ghost" size="sm" onSuccess={onRefresh}>
            Relink
          </TowerWebflowOAuthPopupButton>
        ) : null
      }
    >
      <WebflowSitesTable sites={sites} />
    </TowerPageSection>
  );
}

function WebflowDisconnectSection({
  summary,
  canManage,
  onRefresh,
}: Pick<WebflowScreenContext, "summary" | "canManage" | "onRefresh">) {
  const disconnectFieldId = useId();
  const [disconnectConfirm, setDisconnectConfirm] = useState("");
  const [disconnectBusy, setDisconnectBusy] = useState(false);

  const onDisconnect = useCallback(async () => {
    setDisconnectBusy(true);
    try {
      await disconnectWebflowIntegration();
      toast.success("Webflow disconnected");
      setDisconnectConfirm("");
      onRefresh();
    } catch (error) {
      const message = error instanceof WebflowIntegrationApiError ? error.message : "Could not disconnect Webflow";
      toast.error(message);
    } finally {
      setDisconnectBusy(false);
    }
  }, [onRefresh]);

  if (!canManage || !summary.webflowOAuthConnected) {
    return null;
  }

  return (
    <DangerZoneTypedDelete
      panelDescription="Removes OAuth access for this workspace. Reconnect to restore Beacon and the proxy."
      triggerLabel="Disconnect Webflow"
      title="Disconnect Webflow?"
      confirmFieldLabel="Confirmation"
      confirmFieldId={disconnectFieldId}
      expectedValue="disconnect"
      confirmValue={disconnectConfirm}
      onConfirmValueChange={setDisconnectConfirm}
      actionLabel="Disconnect"
      busyLabel="Disconnecting…"
      busy={disconnectBusy}
      onConfirm={() => void onDisconnect()}
    />
  );
}

export function TowerWebflowScreen({ summary, oauthConfigured, billingEnabled }: TowerWebflowScreenProps) {
  const router = useRouter();
  const sites = summary.webflowSites ?? [];
  const canManage = summary.activeOrgTeamAdmin;

  const onRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const context: WebflowScreenContext = {
    summary,
    oauthConfigured,
    canManage,
    sites,
    onRefresh,
  };

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Webflow connection"
        description="Manage the shared Webflow connection for this workspace."
        actions={
          canManage && oauthConfigured ? (
            <TowerWebflowOAuthPopupButton
              variant={summary.webflowOAuthConnected ? "outline" : "default"}
              onSuccess={onRefresh}
            >
              {summary.webflowOAuthConnected ? "Relink Webflow" : "Connect Webflow"}
            </TowerWebflowOAuthPopupButton>
          ) : null
        }
        meta={
          summary.activeOrganizationName ? (
            <span>
              Workspace <span className="font-medium text-foreground">{summary.activeOrganizationName}</span>
            </span>
          ) : null
        }
      />

      <div className="mb-8">
        <TowerWebflowSetupAlerts summary={summary} billingEnabled={billingEnabled} oauthConfigured={oauthConfigured} />
      </div>
      <WebflowConnectionSection summary={summary} sites={sites} />
      <WebflowSitesSection {...context} />
      <WebflowDisconnectSection summary={summary} canManage={canManage} onRefresh={onRefresh} />
    </TowerPageMain>
  );
}
