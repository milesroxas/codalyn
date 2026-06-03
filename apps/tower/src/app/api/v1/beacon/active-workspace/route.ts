import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { userHasActiveMembershipInOrganization } from "@/server/membership/workspace-ownership";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { db } from "@/shared/lib/db";
import { session as sessionTable } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const verified = await verifyTowerApiRequest(req);
  if (!verified.ok) {
    return verified.response;
  }
  if (!verified.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Response.json({ error: "Expected object body" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const orgRaw = body.organizationId;
  const organizationId = typeof orgRaw === "string" ? orgRaw.trim() : "";
  if (!organizationId) {
    return Response.json({ error: "organizationId required" }, { status: 400 });
  }

  const memberOk = await userHasActiveMembershipInOrganization(verified.userId, organizationId);
  if (!memberOk) {
    return Response.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  const sessionData = await auth.api.getSession({ headers: req.headers });
  const sessionId = (sessionData?.session as { id?: string } | undefined)?.id;
  if (!sessionId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  await db.update(sessionTable).set({ activeOrganizationId: organizationId }).where(eq(sessionTable.id, sessionId));

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
