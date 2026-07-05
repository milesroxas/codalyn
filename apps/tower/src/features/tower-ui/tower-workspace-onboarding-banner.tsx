"use client";

import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createWorkspaceOrganization } from "@/features/team/api/create-workspace-organization";
import { useActiveTowerOrganizations } from "@/features/team/model/use-active-tower-organizations";
import { useWorkspaceCreationEligibility } from "@/features/team/model/use-workspace-creation-eligibility";
import { CreateWorkspaceDialog } from "@/features/team/ui/create-workspace-dialog";
import { effectiveWorkspaceMembershipCount } from "@/features/tower-ui/lib/effective-workspace-membership-count";
import { notifyWebflowConnectionQueryStatus } from "@/features/tower-ui/lib/tower-webflow-connection-toasts";
import {
  parseTowerWebflowQueryStatus,
  resolveTowerWorkspaceOnboardingBlocker,
  shouldSuppressOnboardingForQuery,
  TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY,
  TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST,
  type TowerOnboardingAlertCopy,
  type TowerWorkspaceOnboardingBlocker,
  towerWebflowQueryStatusCopy,
  towerWorkspaceOnboardingCopy,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import { useTowerWebflowOAuthPopup } from "@/features/tower-ui/use-tower-webflow-oauth-popup";
import type { TowerOnboardingBannerSummary } from "@/server/tower-onboarding-banner-summary";
import { TOWER_CONNECTION_PATH, TOWER_CONNECTION_STATUS_QUERY } from "@/shared/lib/navigation/tower-app-paths";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type TowerWorkspaceOnboardingBannerProps = {
  summary: TowerOnboardingBannerSummary;
  billingEnabled: boolean;
  oauthConfigured?: boolean;
  /** When true, nudge workspace admins who still need to connect Webflow. */
  includeWebflowConnect?: boolean;
};

type OnboardingBlockerAlertProps = {
  copy: TowerOnboardingAlertCopy;
  actions?: ReactNode;
  icon?: typeof IconAlertCircle;
};

function OnboardingBlockerAlert({ copy, actions, icon: Icon = IconAlertCircle }: OnboardingBlockerAlertProps) {
  return (
    <Alert variant={copy.variant}>
      <Icon />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.description}</AlertDescription>
      {actions ? <AlertAction>{actions}</AlertAction> : null}
    </Alert>
  );
}

function OnboardingAlertActions({
  blocker,
  canCreateWorkspace,
  showUpgradeForAnotherWorkspace,
  billingEnabled,
  oauthConfigured,
  onOpenCreate,
}: {
  blocker: TowerWorkspaceOnboardingBlocker;
  canCreateWorkspace: boolean;
  showUpgradeForAnotherWorkspace: boolean;
  billingEnabled: boolean;
  oauthConfigured: boolean;
  onOpenCreate: () => void;
}) {
  if (blocker === "needs_workspace" && canCreateWorkspace) {
    return (
      <Button type="button" variant="default" size="sm" onClick={onOpenCreate}>
        Create workspace
      </Button>
    );
  }

  if (blocker === "needs_workspace" && showUpgradeForAnotherWorkspace) {
    return (
      <>
        {billingEnabled ? (
          <Button variant="default" size="sm" asChild>
            <Link href="/billing">Upgrade to Pro</Link>
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
      // Post-connect navigation + tree refresh are owned by useTowerWebflowOAuthPopup.
      <TowerWebflowOAuthPopupButton variant="default" size="sm">
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
  canCreateWorkspace,
  billingEnabled,
  oauthConfigured,
  blocker,
}: {
  canCreateWorkspace: boolean;
  billingEnabled: boolean;
  oauthConfigured: boolean;
  blocker: TowerWorkspaceOnboardingBlocker;
}) {
  const router = useRouter();
  const { refetchOrgs, refetchActiveOrg } = useActiveTowerOrganizations();
  const { openPopup } = useTowerWebflowOAuthPopup();
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (blocker !== "needs_workspace" || !canCreateWorkspace) {
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
  }, [blocker, canCreateWorkspace]);

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
    if (result.activated && oauthConfigured) {
      toast.success("Workspace created");
      // Chain straight into Webflow connect. Started before the org refetches: window.open
      // must stay close to the submit gesture or popup blockers eat it. If it is blocked
      // anyway, the onboarding banner's Connect Webflow button remains as the fallback.
      void openPopup();
    } else if (!result.activated) {
      toast.warning("Workspace created. Switch to it from the workspace menu to see your own usage limits.");
    } else {
      toast.success("Workspace created");
    }
    await Promise.all([refetchOrgs(), refetchActiveOrg()]);
    router.refresh();
    return true;
  }

  return (
    <>
      <OnboardingBlockerAlert
        copy={copy}
        actions={
          <OnboardingAlertActions
            blocker={blocker}
            canCreateWorkspace={canCreateWorkspace}
            showUpgradeForAnotherWorkspace={!canCreateWorkspace}
            billingEnabled={billingEnabled}
            oauthConfigured={oauthConfigured}
            onOpenCreate={() => setCreateOpen(true)}
          />
        }
      />

      {canCreateWorkspace ? (
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

function TowerWorkspaceOnboardingBannerInner({
  summary,
  billingEnabled,
  oauthConfigured = false,
  includeWebflowConnect = false,
}: TowerWorkspaceOnboardingBannerProps) {
  const searchParams = useSearchParams();
  const { orgs, activeOrg, orgsPending } = useActiveTowerOrganizations();
  const membershipCount = effectiveWorkspaceMembershipCount(
    summary.workspaceMembershipCount,
    orgs?.length,
    orgsPending
  );
  const gateSummary = { ...summary, workspaceMembershipCount: membershipCount };
  const { canCreateWorkspace, showUpgradeForAnotherWorkspace } = useWorkspaceCreationEligibility({
    serverCanCreate: summary.canCreateOrganization,
    refetchKey: `${membershipCount}:${orgs?.length ?? 0}:${activeOrg?.id ?? ""}`,
  });
  const blocker = resolveTowerWorkspaceOnboardingBlocker(gateSummary, { includeWebflowConnect });
  const queryStatus = parseTowerWebflowQueryStatus(
    searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow")
  );

  if (!blocker || shouldSuppressOnboardingForQuery(queryStatus, blocker)) {
    return null;
  }

  if (blocker === "needs_workspace" && canCreateWorkspace) {
    return (
      <TowerWorkspaceCreateWorkspacePanel
        canCreateWorkspace={canCreateWorkspace}
        billingEnabled={billingEnabled}
        oauthConfigured={oauthConfigured}
        blocker={blocker}
      />
    );
  }

  const copy = towerWorkspaceOnboardingCopy(blocker);
  return (
    <OnboardingBlockerAlert
      copy={copy}
      actions={
        <OnboardingAlertActions
          blocker={blocker}
          canCreateWorkspace={canCreateWorkspace}
          showUpgradeForAnotherWorkspace={showUpgradeForAnotherWorkspace}
          billingEnabled={billingEnabled}
          oauthConfigured={oauthConfigured}
          onOpenCreate={() => undefined}
        />
      }
    />
  );
}

export function TowerWorkspaceOnboardingBanner(props: TowerWorkspaceOnboardingBannerProps) {
  return (
    <Suspense fallback={null}>
      <TowerWorkspaceOnboardingBannerInner {...props} />
    </Suspense>
  );
}

type TowerWebflowQueryBannerProps = {
  webflowOAuthConnected: boolean;
};

function connectionStatusQueryKey(status: string, webflowOAuthConnected: boolean): string {
  return `${status}:${webflowOAuthConnected ? "1" : "0"}`;
}

function TowerWebflowQueryBannerInner({ webflowOAuthConnected }: TowerWebflowQueryBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedRef = useRef<string | null>(null);
  // State (not derived) so the rendered alert survives the query strip below.
  const [status, setStatus] = useState(() =>
    parseTowerWebflowQueryStatus(searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow"))
  );

  useEffect(() => {
    const queryStatus = parseTowerWebflowQueryStatus(
      searchParams.get(TOWER_CONNECTION_STATUS_QUERY) ?? searchParams.get("webflow")
    );
    if (!queryStatus) {
      // Query stripped: allow the same status (e.g. a relink) to notify again next time.
      notifiedRef.current = null;
      return;
    }
    setStatus(queryStatus);
    const notifyKey = connectionStatusQueryKey(queryStatus, webflowOAuthConnected);
    if (notifiedRef.current !== notifyKey) {
      notifiedRef.current = notifyKey;
      notifyWebflowConnectionQueryStatus(queryStatus, webflowOAuthConnected);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_CONNECTION_STATUS_QUERY);
    url.searchParams.delete("webflow");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, searchParams, webflowOAuthConnected]);

  if (!status) {
    return null;
  }

  if (status === "connected" && webflowOAuthConnected) {
    return null;
  }

  if (status === "connected" && !webflowOAuthConnected) {
    return (
      <OnboardingBlockerAlert
        copy={{
          variant: "warning",
          title: TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST.title,
          description: TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST.description,
        }}
        actions={null}
      />
    );
  }

  const copy = towerWebflowQueryStatusCopy(status);
  const Icon = status === "connected" ? IconCircleCheck : IconAlertCircle;

  return <OnboardingBlockerAlert copy={copy} actions={null} icon={Icon} />;
}

function TowerWebflowQueryBanner(props: TowerWebflowQueryBannerProps) {
  return (
    <Suspense fallback={null}>
      <TowerWebflowQueryBannerInner {...props} />
    </Suspense>
  );
}

type TowerWebflowSetupAlertsProps = {
  webflowOAuthConnected: boolean;
  oauthConfigured: boolean;
};

function TowerWebflowSetupAlertsInner({ webflowOAuthConnected, oauthConfigured }: TowerWebflowSetupAlertsProps) {
  return (
    <div className="space-y-3">
      <TowerWebflowQueryBanner webflowOAuthConnected={webflowOAuthConnected} />
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
