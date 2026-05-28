import { NextResponse } from "next/server";
import { loadTeamInvitationPreview } from "@/server/membership/team-invitation-preview";

/**
 * Public: invitation context for the accept-invite page (invitation ID acts as the secret).
 */
export async function GET(req: Request) {
  const invitationId = new URL(req.url).searchParams.get("invitationId")?.trim();
  if (!invitationId) {
    return NextResponse.json({ error: "missing_invitation_id" }, { status: 400 });
  }

  const preview = await loadTeamInvitationPreview(invitationId);
  return NextResponse.json(preview);
}
