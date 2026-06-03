import type {
  OperatorMetrics,
  OperatorPlatformMeteringConfig,
  OperatorPlatformMeteringPatch,
  OperatorUsageMetrics,
  OperatorUserDetail,
  OperatorUserListResponse,
  OperatorUserPatch,
  OperatorWorkspaceDetail,
  OperatorWorkspaceListResponse,
  OperatorWorkspacePatch,
} from "@/server/operator/types";
import { workspaceSlugErrorMessage } from "@/shared/lib/membership/workspace-slug-messages";

function formatOperatorApiError(body: { error?: string; message?: string } | null, status: number): string {
  if (body?.message) {
    return workspaceSlugErrorMessage(body.message);
  }
  if (body?.error) {
    return workspaceSlugErrorMessage(body.error);
  }
  return `Request failed with ${status}`;
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new OperatorApiError(formatOperatorApiError(body, res.status), res.status);
  }
  return (await res.json()) as T;
}

export class OperatorApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OperatorApiError";
    this.status = status;
  }
}

export function formatOperatorUserDeleteError(error: OperatorApiError): string {
  if (error.message === "confirm_mismatch") {
    return "Email does not match.";
  }
  if (error.message === "delete_failed") {
    return "Delete failed. Check server logs and workspace ownership.";
  }
  if (error.message === "cannot_delete_self") {
    return "You cannot delete your own operator account from this panel.";
  }
  // 409 responses include a human-readable `message` from UserAccountDeletionBlockedError.
  return error.message;
}

export function formatOperatorWorkspaceDeleteError(error: OperatorApiError): string {
  if (error.message === "confirm_mismatch") {
    return "Slug does not match.";
  }
  if (error.message === "confirm_phrase_mismatch" || error.message === "confirmPhrase required") {
    return "Type PURGE to confirm permanent removal.";
  }
  if (error.message === "rate_limited") {
    return "Too many delete attempts. Wait a few minutes and try again.";
  }
  if (error.message === "deletion_incomplete") {
    return "Billing was canceled but deletion did not finish. Try again.";
  }
  return error.message;
}

export function formatOperatorWorkspacePatchError(error: OperatorApiError): string {
  if (error.message === "workspace_scheduled_for_deletion") {
    return "This workspace is scheduled for deletion. Purge it or wait for the recovery window to end before editing.";
  }
  if (error.message === "billing_managed_by_stripe") {
    return "Plan and subscription status are managed by Stripe for this workspace.";
  }
  if (error.message === "seat_limit_below_usage") {
    return "Seat limit cannot be below current members and pending invites.";
  }
  return error.message;
}

export type OperatorUserListQuery = {
  q?: string;
  limit?: number;
  offset?: number;
  role?: "user" | "product_admin";
  banned?: boolean;
  canCreateOrganization?: boolean;
  emailVerified?: boolean;
};

export type OperatorWorkspaceListQuery = {
  q?: string;
  limit?: number;
  offset?: number;
  billingPlan?: string;
  subscriptionStatus?: string;
};

function toSearchParams(query: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    sp.set(key, String(value));
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export const operatorApi = {
  metrics: async (): Promise<OperatorMetrics> => requestJson<OperatorMetrics>("/api/operator/metrics"),
  usageMetrics: async (): Promise<OperatorUsageMetrics> =>
    requestJson<OperatorUsageMetrics>("/api/operator/usage-metrics"),
  listUsers: async (query: OperatorUserListQuery = {}): Promise<OperatorUserListResponse> =>
    requestJson<OperatorUserListResponse>(`/api/operator/users${toSearchParams(query)}`),
  getUser: async (userId: string): Promise<OperatorUserDetail> =>
    requestJson<OperatorUserDetail>(`/api/operator/users/${encodeURIComponent(userId)}`),
  patchUser: async (userId: string, patch: OperatorUserPatch): Promise<OperatorUserDetail> =>
    requestJson<OperatorUserDetail>(`/api/operator/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteUser: async (userId: string, confirmEmail: string): Promise<{ ok: true }> =>
    requestJson<{ ok: true }>(
      `/api/operator/users/${encodeURIComponent(userId)}?confirm=${encodeURIComponent(confirmEmail)}`,
      { method: "DELETE" }
    ),
  inviteCustomer: async (
    email: string
  ): Promise<{ ok: true; kind: "existing_user" | "new_user"; inviteUrl?: string }> =>
    requestJson("/api/operator/customer-invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  listEarlyAccessRequests: async (
    status: "pending" | "approved" | "dismissed" | "all" = "pending"
  ): Promise<{
    rows: Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      note: string | null;
      teamMemberEmails: string[] | null;
      status: string;
      createdAt: string;
      resolvedAt: string | null;
      resolvedByUserId: string | null;
    }>;
  }> => requestJson(`/api/operator/early-access-requests?status=${encodeURIComponent(status)}`),
  resolveEarlyAccessRequest: async (
    id: string,
    action: "approve" | "dismiss" | "resend_approval" | "invite_link",
    declineReason?: string
  ): Promise<{ ok: true; kind?: "existing_user" | "new_user"; inviteUrl?: string; signInUrl?: string }> =>
    requestJson(`/api/operator/early-access-requests/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ action, ...(action === "dismiss" ? { declineReason } : {}) }),
    }),
  listSupportRequests: async (
    query: { status?: "pending" | "resolved" | "dismissed" | "all"; kind?: "all" | "feedback" | "help" } = {}
  ): Promise<{
    rows: Array<{
      id: string;
      kind: "feedback" | "help";
      topic: string;
      details: string;
      email: string;
      userId: string | null;
      status: "pending" | "resolved" | "dismissed";
      operatorNote: string | null;
      createdAt: string;
      resolvedAt: string | null;
      resolvedByUserId: string | null;
    }>;
  }> =>
    requestJson(
      `/api/operator/support-requests${toSearchParams({
        status: query.status ?? "pending",
        kind: query.kind ?? "all",
      })}`
    ),
  resolveSupportRequest: async (
    id: string,
    action: "resolve" | "dismiss",
    operatorNote?: string | null
  ): Promise<{ ok: true }> =>
    requestJson(`/api/operator/support-requests/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ action, operatorNote: operatorNote ?? null }),
    }),
  patchSupportRequestNote: async (id: string, operatorNote: string | null): Promise<{ ok: true }> =>
    requestJson(`/api/operator/support-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ operatorNote }),
    }),
  listWorkspaces: async (query: OperatorWorkspaceListQuery = {}): Promise<OperatorWorkspaceListResponse> =>
    requestJson<OperatorWorkspaceListResponse>(`/api/operator/workspaces${toSearchParams(query)}`),
  getWorkspace: async (orgId: string): Promise<OperatorWorkspaceDetail> =>
    requestJson<OperatorWorkspaceDetail>(`/api/operator/workspaces/${encodeURIComponent(orgId)}`),
  patchWorkspace: async (orgId: string, patch: OperatorWorkspacePatch): Promise<OperatorWorkspaceDetail> =>
    requestJson<OperatorWorkspaceDetail>(`/api/operator/workspaces/${encodeURIComponent(orgId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  resetUserUsage: async (userId: string): Promise<{ ok: true }> =>
    requestJson<{ ok: true }>(`/api/operator/users/${encodeURIComponent(userId)}/usage-reset`, {
      method: "POST",
    }),
  resetWorkspaceUsage: async (orgId: string): Promise<{ ok: true }> =>
    requestJson<{ ok: true }>(`/api/operator/workspaces/${encodeURIComponent(orgId)}/usage-reset`, {
      method: "POST",
    }),
  getPlatformMetering: async (): Promise<OperatorPlatformMeteringConfig> =>
    requestJson<OperatorPlatformMeteringConfig>("/api/operator/platform/metering"),
  patchPlatformMetering: async (patch: OperatorPlatformMeteringPatch): Promise<OperatorPlatformMeteringConfig> =>
    requestJson<OperatorPlatformMeteringConfig>("/api/operator/platform/metering", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteWorkspace: async (
    orgId: string,
    confirmSlug: string,
    options?: { confirmPhrase?: string }
  ): Promise<{ ok: true }> =>
    requestJson<{ ok: true }>(`/api/operator/workspaces/${encodeURIComponent(orgId)}`, {
      method: "DELETE",
      body: JSON.stringify({
        confirmSlug,
        ...(options?.confirmPhrase ? { confirmPhrase: options.confirmPhrase } : {}),
      }),
    }),
};
