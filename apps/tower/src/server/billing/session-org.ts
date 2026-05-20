import { auth } from "@/server/auth";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";

export async function getActiveOrganizationIdForAuthHeaders(incoming: Headers): Promise<string | null> {
  const sessionData = await auth.api.getSession({ headers: incoming });
  const userId = sessionData?.user?.id;
  if (!userId) {
    return null;
  }
  const rawSession = sessionData.session as { id?: string } | undefined;
  return resolveActiveOrganizationId(userId, rawSession?.id);
}

export function getActiveOrganizationIdForApiRequest(request: Request): Promise<string | null> {
  return getActiveOrganizationIdForAuthHeaders(request.headers);
}
