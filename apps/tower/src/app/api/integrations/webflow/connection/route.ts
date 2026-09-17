import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { canTowerUserManageWebflowOAuthViaDashboard } from "@/server/tower-webflow-oauth-team-admin";
import { normalizeWebflowAppKey } from "@/server/webflow-app-registry";
import { revokeWebflowAccessToken } from "@/server/webflow-oauth-exchange";
import {
  deleteOrganizationWebflowOAuthToken,
  resolveActiveOrganizationWebflowToken,
} from "@/server/webflow-proxy-token";

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
  // Revoke at Webflow first, then forget locally: "users must be able to fully revoke your App's access"
  // (Marketplace guidelines, Data Client Apps). Deleting only the stored copy would leave the
  // authorization live in the user's Webflow workspace with no holder. Best-effort — the row is deleted
  // either way, so a Webflow outage cannot keep a token Tower no longer wants.
  const stored = await resolveActiveOrganizationWebflowToken({ userId: session.user.id, request, app });
  if (stored) {
    const revoked = await revokeWebflowAccessToken(stored.accessToken, app);
    if (!revoked) {
      console.warn(
        `[tower/webflow-oauth] revoke_authorization did not confirm for org ${activeOrganizationId} (${app})`
      );
    }
  }
  await deleteOrganizationWebflowOAuthToken(activeOrganizationId, app);

  return Response.json({ ok: true });
}
