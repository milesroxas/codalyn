"use client";

import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { createWorkspaceOrganization } from "@/features/team/api/create-workspace-organization";
import { CreateWorkspaceDialog } from "@/features/team/ui/create-workspace-dialog";
import {
  parseTowerWebflowQueryStatus,
  resolveTowerWorkspaceOnboardingBlocker,
  shouldSuppressOnboardingForQuery,
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
          <Link href="/team">Team settings</Link>
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

  const copy = towerWorkspaceOnboardingCopy(blocker, summary.canCreateOrganization);

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
          onOpenChange={setCreateOpen}
          orgName={orgName}
          onOrgNameChange={setOrgName}
          busy={busy}
          onSubmit={onCreateWorkspace}
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
  const copy = towerWorkspaceOnboardingCopy(blocker, summary.canCreateOrganization);

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

export function TowerWorkspaceOnboardingBanner({
  summary,
  billingEnabled,
  oauthConfigured = false,
  includeWebflowConnect = false,
  embedded = false,
}: TowerWorkspaceOnboardingBannerProps) {
  const router = useRouter();
  const onWebflowConnectSuccess = useCallback(() => {
    router.refresh();
  }, [router]);
  const blocker = resolveTowerWorkspaceOnboardingBlocker(summary, { includeWebflowConnect });

  if (!blocker) {
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

  return <div className="mb-8">{content}</div>;
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
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_CONNECTION_STATUS_QUERY);
    url.searchParams.delete("webflow");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [status, router, searchParams]);

  if (!status) {
    return null;
  }

  if (status === "connected" && !webflowOAuthConnected) {
    return (
      <Alert variant="warning">
        <IconAlertCircle />
        <AlertTitle>Webflow is not connected yet</AlertTitle>
        <AlertDescription>
          This page was opened after authorization, but this workspace still has no stored Webflow token. Try connecting
          again or switch to the workspace you linked.
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
  billingEnabled: boolean;
  oauthConfigured: boolean;
};

function TowerWebflowSetupAlertsInner({ summary, billingEnabled, oauthConfigured }: TowerWebflowSetupAlertsProps) {
  const searchParams = useSearchParams();
  const queryStatus = parseTowerWebflowQueryStatus(
    searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow")
  );
  const blocker = resolveTowerWorkspaceOnboardingBlocker(summary);
  const suppressOnboarding = shouldSuppressOnboardingForQuery(queryStatus, blocker);

  return (
    <div className="space-y-3">
      <TowerWebflowQueryBanner webflowOAuthConnected={summary.webflowOAuthConnected} />
      {suppressOnboarding ? null : (
        <TowerWorkspaceOnboardingBanner
          summary={summary}
          billingEnabled={billingEnabled}
          oauthConfigured={oauthConfigured}
          embedded
        />
      )}
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
