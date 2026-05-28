import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { resolveUserWorkspaceCreationEligibility } from "@/server/membership/user-workspace-creation-eligibility";

export const dynamic = "force-dynamic";

/** Authoritative workspace-creation gate for signed-in users (UI must not rely on stale layout props alone). */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const eligibility = await resolveUserWorkspaceCreationEligibility(session.user.id);

  return NextResponse.json({
    canCreate: eligibility.canCreate,
    ownedWorkspaceCount: eligibility.ownedWorkspaceCount,
  });
}
