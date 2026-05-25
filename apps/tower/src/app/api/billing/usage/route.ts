import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const h = await headers();
  const activeOrg = await getActiveOrganizationIdForAuthHeaders(h);
  const status = await fetchEndUserUsageStatus(userId, activeOrg);
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
