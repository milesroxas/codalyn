import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { canTowerUserManageWebflowOAuthViaDashboard } from "@/server/tower-webflow-oauth-team-admin";
import { normalizeWebflowAppKey } from "@/server/webflow-app-registry";
import { deleteOrganizationWebflowOAuthToken } from "@/server/webflow-proxy-token";

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = await canTowerUserManageWebflowOAuthViaDashboard(session.user.id, request.headers);
  if (!allowed) {
    return Response.json({ error: "team_admin_required" }, { status: 403 });
  }

  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(request.headers);
  if (!activeOrganizationId) {
    return Response.json({ error: "no_active_workspace" }, { status: 400 });
  }

  // Disconnect only the requested app's token (default Beacon); leaves the other app connected.
  const app = normalizeWebflowAppKey(new URL(request.url).searchParams.get("app"));
  await deleteOrganizationWebflowOAuthToken(activeOrganizationId, app);

  return Response.json({ ok: true });
}
