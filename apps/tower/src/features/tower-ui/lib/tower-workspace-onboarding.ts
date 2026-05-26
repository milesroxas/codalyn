import type { TowerDashboardSummary } from "@/server/dashboard-summary";

export type TowerWorkspaceOnboardingBlocker =
  | "needs_workspace"
  | "needs_active_workspace"
  | "webflow_admin_only"
  | "needs_webflow_connect";

export type TowerWebflowQueryStatus = "connected" | "no_active_workspace" | "team_admin_required";

export type TowerOnboardingAlertCopy = {
  title: string;
  description: string;
  variant: "warning" | "info";
};

export function resolveTowerWorkspaceOnboardingBlocker(
  summary: Pick<
    TowerDashboardSummary,
    "workspaceMembershipCount" | "activeOrganizationId" | "webflowOAuthConnected" | "activeOrgTeamAdmin"
  >,
  opts?: { includeWebflowConnect?: boolean }
): TowerWorkspaceOnboardingBlocker | null {
  if (summary.workspaceMembershipCount === 0) {
    return "needs_workspace";
  }

  if (!summary.activeOrganizationId) {
    return "needs_active_workspace";
  }

  if (!summary.webflowOAuthConnected && !summary.activeOrgTeamAdmin) {
    return "webflow_admin_only";
  }

  if (opts?.includeWebflowConnect && !summary.webflowOAuthConnected && summary.activeOrgTeamAdmin) {
    return "needs_webflow_connect";
  }

  return null;
}

export function parseTowerWebflowQueryStatus(value: string | null): TowerWebflowQueryStatus | null {
  if (value === "connected" || value === "no_active_workspace" || value === "team_admin_required") {
    return value;
  }
  return null;
}

export function towerWorkspaceOnboardingCopy(blocker: TowerWorkspaceOnboardingBlocker): TowerOnboardingAlertCopy {
  switch (blocker) {
    case "needs_workspace":
      return {
        variant: "warning",
        title: "Create a workspace to connect Webflow",
        description: "Webflow needs a workspace before it can connect.",
      };
    case "needs_active_workspace":
      return {
        variant: "warning",
        title: "Select an active workspace",
        description: "Select a workspace from the header menu.",
      };
    case "webflow_admin_only":
      return {
        variant: "info",
        title: "Webflow must be connected by a workspace admin",
        description: "Ask a workspace admin to connect Webflow.",
      };
    case "needs_webflow_connect":
      return {
        variant: "warning",
        title: "Connect Webflow for this workspace",
        description: "Link Webflow once as a workspace admin.",
      };
  }
}

export function towerWebflowQueryStatusCopy(status: TowerWebflowQueryStatus): TowerOnboardingAlertCopy {
  switch (status) {
    case "connected":
      return {
        variant: "info",
        title: "Webflow connected",
        description: "Webflow is connected for this workspace.",
      };
    case "no_active_workspace":
      return {
        variant: "warning",
        title: "Select or create a workspace first",
        description: "Select or create a workspace from the header menu.",
      };
    case "team_admin_required":
      return {
        variant: "info",
        title: "Workspace admin required",
        description: "Ask a workspace admin to connect Webflow.",
      };
  }
}

export type WebflowOAuthAuthorizeError =
  | "unauthorized"
  | "no_active_workspace"
  | "team_admin_required"
  | "oauth_config"
  | "oauth_url_failed"
  | "unknown";

export function messageForWebflowOAuthAuthorizeError(error: WebflowOAuthAuthorizeError): string {
  switch (error) {
    case "unauthorized":
      return "Sign in to connect Webflow.";
    case "no_active_workspace":
      return "Select or create a workspace before connecting Webflow.";
    case "team_admin_required":
      return "Only a workspace admin or owner can connect Webflow.";
    case "oauth_config":
      return "Webflow OAuth is not configured on this Tower instance.";
    case "oauth_url_failed":
      return "Could not start Webflow authorization. Try again.";
    default:
      return "Could not start Webflow authorization.";
  }
}

export function shouldSuppressOnboardingForQuery(
  query: TowerWebflowQueryStatus | null,
  blocker: TowerWorkspaceOnboardingBlocker | null
): boolean {
  if (!query || !blocker) {
    return false;
  }
  if (query === "team_admin_required" && blocker === "webflow_admin_only") {
    return true;
  }
  if (query === "no_active_workspace" && (blocker === "needs_active_workspace" || blocker === "needs_workspace")) {
    return true;
  }
  if (query === "connected" && blocker === "needs_webflow_connect") {
    return true;
  }
  return false;
}

export function parseWebflowOAuthAuthorizeError(
  status: number,
  body: { error?: string } | null
): WebflowOAuthAuthorizeError {
  const code = body?.error?.trim();
  if (status === 401 || code === "unauthorized") {
    return "unauthorized";
  }
  if (status === 400 && code === "no_active_workspace") {
    return "no_active_workspace";
  }
  if (status === 403 && code === "team_admin_required") {
    return "team_admin_required";
  }
  if (status === 500 && code?.includes("WEBFLOW_CLIENT_ID")) {
    return "oauth_config";
  }
  if (code === "oauth_url_failed") {
    return "oauth_url_failed";
  }
  return "unknown";
}
