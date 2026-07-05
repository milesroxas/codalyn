import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import type { TowerOnboardingBannerSummary } from "@/server/tower-onboarding-banner-summary";

export type TowerOnboardingGateSummary = TowerOnboardingBannerSummary | TowerDashboardSummary;

export type TowerWorkspaceOnboardingBlocker =
  | "needs_workspace"
  | "needs_active_workspace"
  | "webflow_admin_only"
  | "needs_webflow_connect";

export type TowerWebflowQueryStatus = "connected" | "no_active_workspace" | "team_admin_required" | "pending_expired";

export type TowerOnboardingAlertCopy = {
  title: string;
  description: string;
  variant: "warning" | "info";
};

/** Session flag: user closed the first-workspace dialog without creating one. */
export const TOWER_CREATE_WORKSPACE_DIALOG_DISMISSED_KEY = "tower.create-workspace-dialog.dismissed";

export function resolveTowerWorkspaceOnboardingBlocker(
  summary: Pick<
    TowerOnboardingGateSummary,
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

export function shouldShowPageHeaderWebflowAction(
  summary: Pick<
    TowerOnboardingGateSummary,
    "workspaceMembershipCount" | "activeOrganizationId" | "webflowOAuthConnected" | "activeOrgTeamAdmin"
  >
): boolean {
  const blocker = resolveTowerWorkspaceOnboardingBlocker(summary, { includeWebflowConnect: true });
  if (summary.webflowOAuthConnected) {
    return summary.activeOrgTeamAdmin;
  }
  return blocker === null;
}

export function parseTowerWebflowQueryStatus(value: string | null): TowerWebflowQueryStatus | null {
  if (
    value === "connected" ||
    value === "no_active_workspace" ||
    value === "team_admin_required" ||
    value === "pending_expired"
  ) {
    return value;
  }
  return null;
}

export function towerWorkspaceOnboardingCopy(blocker: TowerWorkspaceOnboardingBlocker): TowerOnboardingAlertCopy {
  switch (blocker) {
    case "needs_workspace":
      return {
        variant: "warning",
        title: "Create your first workspace",
        description: "Tower links to Webflow through a workspace. Create one to connect Webflow and invite your team.",
      };
    case "needs_active_workspace":
      return {
        variant: "warning",
        title: "Choose a workspace",
        description: "Select the workspace you want to work in from the menu in the header.",
      };
    case "webflow_admin_only":
      return {
        variant: "info",
        title: "Webflow connection needed",
        description: "A workspace admin must connect Webflow before you can use Beacon and connected features.",
      };
    case "needs_webflow_connect":
      return {
        variant: "warning",
        title: "Connect Webflow",
        description: "Authorize Webflow for this workspace once. Your team can then use Beacon and integrations.",
      };
  }
}

export function towerWebflowQueryStatusCopy(status: TowerWebflowQueryStatus): TowerOnboardingAlertCopy {
  switch (status) {
    case "connected":
      return {
        variant: "info",
        title: "Webflow connected",
        description: "This workspace is linked to Webflow. You can manage sites and presets from Tower.",
      };
    case "no_active_workspace":
      return {
        variant: "warning",
        title: "Choose a workspace first",
        description: "Select or create a workspace from the header, then connect Webflow.",
      };
    case "team_admin_required":
      return {
        variant: "info",
        title: "Admin access required",
        description: "Only a workspace admin can connect Webflow. Ask an admin to finish setup.",
      };
    case "pending_expired":
      return {
        variant: "warning",
        title: "Authorization expired",
        description:
          "Webflow authorization codes expire after 15 minutes. Install or connect again from Webflow or Tower.",
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
      return "Choose or create a workspace before connecting Webflow.";
    case "team_admin_required":
      return "Only a workspace admin can connect Webflow.";
    case "oauth_config":
      return "Webflow OAuth is not configured on this Tower instance.";
    case "oauth_url_failed":
      return "Could not start Webflow authorization. Try again.";
    default:
      return "Could not start Webflow authorization.";
  }
}

export function messageForWebflowOAuthCallbackError(error?: string | null): string {
  const code = error?.trim();
  switch (code) {
    case "access_denied":
      return "Webflow authorization was cancelled.";
    case "invalid_state":
      return "This connection session expired. Try connecting again.";
    case "team_admin_required":
      return messageForWebflowOAuthAuthorizeError("team_admin_required");
    case "missing_code":
      return "Webflow authorization did not finish. Try connecting again.";
    case "pending_expired":
      return "This Webflow authorization expired. Install or connect again from Webflow or Tower.";
    case "token_exchange":
    case "token_exchange_failed":
      return "Could not complete Webflow connection. Try again.";
    case "no_active_workspace":
      return messageForWebflowOAuthAuthorizeError("no_active_workspace");
    default:
      if (code) {
        return "Webflow connection failed. Try again.";
      }
      return "Webflow connection failed. Try again.";
  }
}

export type WebflowOAuthPostMessage = {
  type: "codalyn:webflow-oauth";
  status: "success" | "error";
  error?: string;
};

export function parseWebflowOAuthPostMessage(data: unknown): WebflowOAuthPostMessage | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (record.type !== "codalyn:webflow-oauth") {
    return null;
  }
  if (record.status === "success") {
    return { type: "codalyn:webflow-oauth", status: "success" };
  }
  if (record.status === "error") {
    const error = typeof record.error === "string" ? record.error : undefined;
    return { type: "codalyn:webflow-oauth", status: "error", error };
  }
  return null;
}

export const TOWER_WEBFLOW_CONNECTED_TOAST = {
  title: "Webflow connected",
  description: "This workspace is linked to Webflow.",
} as const;

export const TOWER_WEBFLOW_POPUP_BLOCKED_MESSAGE =
  "Your browser blocked the Webflow window. Use the Connect Webflow button to continue." as const;

export const TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST = {
  title: "Connection not saved",
  description: "Authorization finished, but this workspace has no Webflow token. Connect again or switch workspace.",
} as const;

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
