import { auth } from "@/server/auth";
import { type ActiveOrganizationFallback, resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";

/**
 * Bearer-authenticated requests come from the Designer Extension clients (Better Auth bearer plugin;
 * Tower's own web app only ever sends its session cookie). Those sessions get no defaulted
 * workspace: the extension holds a single-workspace default locally and persists it only on the
 * user's explicit confirmation (Marketplace review round 8, 2026-09-17). Tower's cookie sessions keep
 * the membership default for the dashboard.
 */
export function activeOrganizationFallbackForHeaders(incoming: Headers): ActiveOrganizationFallback {
  const authorization = incoming.get("authorization")?.trim().toLowerCase() ?? "";
  return authorization.startsWith("bearer ") ? "none" : "memberships";
}

export async function getActiveOrganizationIdForAuthHeaders(incoming: Headers): Promise<string | null> {
  const sessionData = await auth.api.getSession({ headers: incoming });
  const userId = sessionData?.user?.id;
  if (!userId) {
    return null;
  }
  const rawSession = sessionData.session as { id?: string } | undefined;
  return resolveActiveOrganizationId(userId, rawSession?.id, activeOrganizationFallbackForHeaders(incoming));
}

export function getActiveOrganizationIdForApiRequest(request: Request): Promise<string | null> {
  return getActiveOrganizationIdForAuthHeaders(request.headers);
}
