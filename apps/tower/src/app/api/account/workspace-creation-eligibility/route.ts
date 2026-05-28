import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { resolveWorkspaceCreationUiEligibility } from "@/server/membership/workspace-creation-ui";

export const dynamic = "force-dynamic";

/** Authoritative workspace-creation gate for signed-in users (UI must not rely on stale layout props alone). */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const activeOrg = await getActiveOrganizationIdForAuthHeaders(await headers());
  const eligibility = await resolveWorkspaceCreationUiEligibility(session.user.id, activeOrg);

  return NextResponse.json({
    canCreate: eligibility.canCreate,
    canShowInSwitcher: eligibility.canShowInSwitcher,
    ownedWorkspaceCount: eligibility.ownedWorkspaceCount,
    hasIndividualPro: eligibility.hasIndividualPro,
    viewingTeamWorkspaceWithoutPro: eligibility.viewingTeamWorkspaceWithoutPro,
  });
}
