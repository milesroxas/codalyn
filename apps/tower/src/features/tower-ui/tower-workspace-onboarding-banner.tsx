"use client";

import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { createWorkspaceOrganization } from "@/features/team/api/create-workspace-organization";
import { CreateWorkspaceDialog } from "@/features/team/ui/create-workspace-dialog";
import { notifyWebflowConnectionQueryStatus } from "@/features/tower-ui/lib/tower-webflow-connection-toasts";
import {
  parseTowerWebflowQueryStatus,
  resolveTowerWorkspaceOnboardingBlocker,
  shouldSuppressOnboardingForQuery,
  TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY,
  type TowerWorkspaceOnboardingBlocker,
  towerWebflowQueryStatusCopy,
  towerWorkspaceOnboardingCopy,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { TOWER_CONNECTION_PATH, TOWER_CONNECTION_STATUS_QUERY } from "@/shared/lib/navigation/tower-app-paths";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type TowerWorkspaceOnboardingBannerProps = {
  summary: TowerDashboardSummary;
  billingEnabled: boolean;
  oauthConfigured?: boolean;
  /** Dashboard only: nudge admins who still need to connect. Omit on `/connection` (page has connect actions). */
  includeWebflowConnect?: boolean;
  /** When nested inside another alert stack, omit outer bottom margin. */
  embedded?: boolean;
};

function OnboardingAlertActions({
  blocker,
  summary,
  billingEnabled,
  oauthConfigured,
  onOpenCreate,
  onWebflowConnectSuccess,
}: {
  blocker: TowerWorkspaceOnboardingBlocker;
  summary: TowerDashboardSummary;
  billingEnabled: boolean;
  oauthConfigured: boolean;
  onOpenCreate: () => void;
  onWebflowConnectSuccess: () => void;
}) {
  if (blocker === "needs_workspace" && summary.canCreateOrganization) {
    return (
      <Button type="button" variant="default" size="sm" onClick={onOpenCreate}>
        Create workspace
      </Button>
    );
  }

  if (blocker === "needs_workspace" && !summary.canCreateOrganization) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href="/team">View team</Link>
        </Button>
        {billingEnabled ? (
          <Button variant="default" size="sm" asChild>
            <Link href="/billing">Upgrade to Team</Link>
          </Button>
        ) : null}
      </>
    );
  }

  if (blocker === "needs_webflow_connect") {
    if (!oauthConfigured) {
      return null;
    }

    return (
      <TowerWebflowOAuthPopupButton variant="default" size="sm" onSuccess={onWebflowConnectSuccess}>
        Connect Webflow
      </TowerWebflowOAuthPopupButton>
    );
  }

  if (blocker === "webflow_admin_only") {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={TOWER_CONNECTION_PATH}>View Webflow status</Link>
      </Button>
    );
  }

  return null;
}

function TowerWorkspaceCreateWorkspacePanel({
  summary,
  billingEnabled,
  oauthConfigured,
  blocker,
  onWebflowConnectSuccess,
}: {
  summary: TowerDashboardSummary;
  billingEnabled: boolean;
  oauthConfigured: boolean;
  blocker: TowerWorkspaceOnboardingBlocker;
  onWebflowConnectSuccess: () => void;
}) {
  const router = useRouter();
  const { refetch: refetchOrgs } = authClient.useListOrganizations();
  const { refetch: refetchActiveOrg } = authClient.useActiveOrganization();
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (blocker !== "needs_workspace" || !summary.canCreateOrganization) {
      return;
    }
    try {
      if (sessionStorage.getItem(TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }
    setCreateOpen(true);
  }, [blocker, summary.canCreateOrganization]);

  const copy = towerWorkspaceOnboardingCopy(blocker);

  function onCreateDialogOpenChange(open: boolean): void {
    setCreateOpen(open);
    if (!open) {
      try {
        sessionStorage.setItem(TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY, "1");
      } catch {
        // ignore storage failures
      }
    }
  }

  async function onCreateWorkspace(event: FormEvent): Promise<boolean> {
    event.preventDefault();
    setBusy(true);
    const result = await createWorkspaceOrganization(orgName);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    setOrgName("");
    try {
      sessionStorage.removeItem(TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY);
    } catch {
      // ignore storage failures
    }
    await Promise.all([refetchOrgs(), refetchActiveOrg()]);
    toast.success("Workspace created");
    router.refresh();
    return true;
  }

  return (
    <>
      <Alert variant={copy.variant}>
        <IconAlertCircle />
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription>{copy.description}</AlertDescription>
        <AlertAction>
          <OnboardingAlertActions
            blocker={blocker}
            summary={summary}
            billingEnabled={billingEnabled}
            oauthConfigured={oauthConfigured}
            onOpenCreate={() => setCreateOpen(true)}
            onWebflowConnectSuccess={onWebflowConnectSuccess}
          />
        </AlertAction>
      </Alert>

      {summary.canCreateOrganization ? (
        <CreateWorkspaceDialog
          open={createOpen}
          onOpenChange={onCreateDialogOpenChange}
          orgName={orgName}
          onOrgNameChange={setOrgName}
          busy={busy}
          onSubmit={onCreateWorkspace}
          title="Create your workspace"
          description="Name your workspace, then connect Webflow from Connection or the dashboard."
        />
      ) : null}
    </>
  );
}

function TowerWorkspaceOnboardingAlert({
  summary,
  billingEnabled,
  oauthConfigured,
  blocker,
  onWebflowConnectSuccess,
}: {
  summary: TowerDashboardSummary;
  billingEnabled: boolean;
  oauthConfigured: boolean;
  blocker: TowerWorkspaceOnboardingBlocker;
  onWebflowConnectSuccess: () => void;
}) {
  const copy = towerWorkspaceOnboardingCopy(blocker);

  return (
    <Alert variant={copy.variant}>
      <IconAlertCircle />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
      <AlertAction>
        <OnboardingAlertActions
          blocker={blocker}
          summary={summary}
          billingEnabled={billingEnabled}
          oauthConfigured={oauthConfigured}
          onOpenCreate={() => undefined}
          onWebflowConnectSuccess={onWebflowConnectSuccess}
        />
      </AlertAction>
    </Alert>
  );
}

function TowerWorkspaceOnboardingBannerInner({
  summary,
  billingEnabled,
  oauthConfigured = false,
  includeWebflowConnect = false,
  embedded = false,
}: TowerWorkspaceOnboardingBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onWebflowConnectSuccess = useCallback(() => {
    router.refresh();
  }, [router]);
  const blocker = resolveTowerWorkspaceOnboardingBlocker(summary, { includeWebflowConnect });
  const queryStatus = parseTowerWebflowQueryStatus(
    searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow")
  );

  if (!blocker || shouldSuppressOnboardingForQuery(queryStatus, blocker)) {
    return null;
  }

  const needsCreateHooks = blocker === "needs_workspace" && summary.canCreateOrganization;
  const content = needsCreateHooks ? (
    <TowerWorkspaceCreateWorkspacePanel
      summary={summary}
      billingEnabled={billingEnabled}
      oauthConfigured={oauthConfigured}
      blocker={blocker}
      onWebflowConnectSuccess={onWebflowConnectSuccess}
    />
  ) : (
    <TowerWorkspaceOnboardingAlert
      summary={summary}
      billingEnabled={billingEnabled}
      oauthConfigured={oauthConfigured}
      blocker={blocker}
      onWebflowConnectSuccess={onWebflowConnectSuccess}
    />
  );

  if (embedded) {
    return content;
  }

  return content;
}

export function TowerWorkspaceOnboardingBanner(props: TowerWorkspaceOnboardingBannerProps) {
  return (
    <Suspense fallback={null}>
      <TowerWorkspaceOnboardingBannerInner {...props} embedded />
    </Suspense>
  );
}

type TowerWebflowQueryBannerProps = {
  webflowOAuthConnected: boolean;
};

function TowerWebflowQueryBannerInner({ webflowOAuthConnected }: TowerWebflowQueryBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status] = useState(() =>
    parseTowerWebflowQueryStatus(searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow"))
  );

  useEffect(() => {
    if (!status || (!searchParams.has(TOWER_CONNECTION_STATUS_QUERY) && !searchParams.has("webflow"))) {
      return;
    }
    notifyWebflowConnectionQueryStatus(status, webflowOAuthConnected);
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_CONNECTION_STATUS_QUERY);
    url.searchParams.delete("webflow");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [status, router, searchParams, webflowOAuthConnected]);

  if (!status) {
    return null;
  }

  if (status === "connected" && !webflowOAuthConnected) {
    return (
      <Alert variant="warning">
        <IconAlertCircle />
        <AlertTitle>Connection not saved</AlertTitle>
        <AlertDescription>
          Authorization finished, but this workspace has no Webflow token yet. Connect again or switch to the workspace
          you authorized.
        </AlertDescription>
      </Alert>
    );
  }

  const copy = towerWebflowQueryStatusCopy(status);
  const Icon = status === "connected" ? IconCircleCheck : IconAlertCircle;

  return (
    <Alert variant={copy.variant}>
      <Icon />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
    </Alert>
  );
}

export function TowerWebflowQueryBanner(props: TowerWebflowQueryBannerProps) {
  return (
    <Suspense fallback={null}>
      <TowerWebflowQueryBannerInner {...props} />
    </Suspense>
  );
}

type TowerWebflowSetupAlertsProps = {
  summary: TowerDashboardSummary;
  oauthConfigured: boolean;
};

function TowerWebflowSetupAlertsInner({ summary, oauthConfigured }: TowerWebflowSetupAlertsProps) {
  return (
    <div className="space-y-3">
      <TowerWebflowQueryBanner webflowOAuthConnected={summary.webflowOAuthConnected} />
      {!oauthConfigured ? (
        <Alert variant="warning">
          <IconAlertCircle />
          <AlertTitle>Webflow OAuth is not configured</AlertTitle>
          <AlertDescription>
            Set <code>WEBFLOW_CLIENT_ID</code> and <code>WEBFLOW_CLIENT_SECRET</code> in the Tower environment to enable
            connections.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function TowerWebflowSetupAlerts(props: TowerWebflowSetupAlertsProps) {
  return (
    <Suspense fallback={null}>
      <TowerWebflowSetupAlertsInner {...props} />
    </Suspense>
  );
}
