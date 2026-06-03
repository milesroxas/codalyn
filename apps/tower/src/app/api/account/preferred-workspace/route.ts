import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { userHasActiveMembershipInOrganization } from "@/server/membership/workspace-ownership";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const orgRaw = body.organizationId;
  const organizationId =
    orgRaw === null || orgRaw === undefined ? null : typeof orgRaw === "string" ? orgRaw.trim() || null : null;

  if (organizationId === null) {
    await db.update(user).set({ preferredOrganizationId: null }).where(eq(user.id, session.user.id));
    return NextResponse.json({ preferredOrganizationId: null });
  }

  const isMember = await userHasActiveMembershipInOrganization(session.user.id, organizationId);
  if (!isMember) {
    return NextResponse.json({ error: "not_member" }, { status: 403 });
  }

  await db.update(user).set({ preferredOrganizationId: organizationId }).where(eq(user.id, session.user.id));

  return NextResponse.json({ preferredOrganizationId: organizationId });
}
