import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { canTowerUserManageWebflowOAuthViaDashboard } from "@/server/tower-webflow-oauth-team-admin";
import { db } from "@/shared/lib/db";
import { organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";

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

  await db
    .delete(organizationWebflowOAuthToken)
    .where(eq(organizationWebflowOAuthToken.organizationId, activeOrganizationId));

  return Response.json({ ok: true });
}
