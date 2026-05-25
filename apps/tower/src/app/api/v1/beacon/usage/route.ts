import { getActiveOrganizationIdForApiRequest } from "@/server/billing/session-org";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ code: "SESSION_REQUIRED", message: "Session required." }, { status: 401 });
  }

  const activeOrg = await getActiveOrganizationIdForApiRequest(req);
  const status = await fetchEndUserUsageStatus(auth.userId, activeOrg);
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
