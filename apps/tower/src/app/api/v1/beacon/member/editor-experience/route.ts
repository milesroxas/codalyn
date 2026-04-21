import { and, eq } from "drizzle-orm";
import { resolveBeaconMembershipContext } from "@/server/beacon-settings-context";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { db } from "@/shared/lib/db";
import { member } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const ctx = await resolveBeaconMembershipContext(req);
  if (!ctx?.activeOrganizationId) {
    return Response.json({ error: "Choose a workspace first" }, { status: 400 });
  }

  if (!isTowerTeamAdminRole(ctx.memberRole)) {
    return Response.json({ error: "Team admins only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as { restrictToEditorExperience?: unknown };
  if (typeof raw.restrictToEditorExperience !== "boolean") {
    return Response.json({ error: "restrictToEditorExperience (boolean) required" }, { status: 400 });
  }

  await db
    .update(member)
    .set({ beaconRestrictToEditorExperience: raw.restrictToEditorExperience })
    .where(and(eq(member.userId, auth.userId), eq(member.organizationId, ctx.activeOrganizationId)));

  return Response.json(
    { ok: true, restrictToEditorExperience: raw.restrictToEditorExperience },
    { headers: { "Cache-Control": "no-store" } }
  );
}
