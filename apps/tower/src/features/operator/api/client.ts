import type {
  OperatorMetrics,
  OperatorUserDetail,
  OperatorUserListResponse,
  OperatorUserPatch,
  OperatorWorkspaceDetail,
  OperatorWorkspaceListResponse,
  OperatorWorkspacePatch,
} from "@/server/operator/types";

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
    let message = `Request failed with ${res.status}`;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) {
      message = body.error;
    }
    throw new OperatorApiError(message, res.status);
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
  listWorkspaces: async (query: OperatorWorkspaceListQuery = {}): Promise<OperatorWorkspaceListResponse> =>
    requestJson<OperatorWorkspaceListResponse>(`/api/operator/workspaces${toSearchParams(query)}`),
  getWorkspace: async (orgId: string): Promise<OperatorWorkspaceDetail> =>
    requestJson<OperatorWorkspaceDetail>(`/api/operator/workspaces/${encodeURIComponent(orgId)}`),
  patchWorkspace: async (orgId: string, patch: OperatorWorkspacePatch): Promise<OperatorWorkspaceDetail> =>
    requestJson<OperatorWorkspaceDetail>(`/api/operator/workspaces/${encodeURIComponent(orgId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteWorkspace: async (orgId: string, confirmSlug: string): Promise<{ ok: true }> =>
    requestJson<{ ok: true }>(
      `/api/operator/workspaces/${encodeURIComponent(orgId)}?confirm=${encodeURIComponent(confirmSlug)}`,
      { method: "DELETE" }
    ),
};
