import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { deleteTeamInvitation, InvitationDeletionError } from "@/server/membership/delete-invitation";

export const dynamic = "force-dynamic";

type DeleteInvitationBody = {
  invitationId?: unknown;
  organizationId?: unknown;
};

function parseDeleteInvitationBody(raw: unknown): { invitationId: string; organizationId: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as DeleteInvitationBody;
  const invitationId = typeof body.invitationId === "string" ? body.invitationId.trim() : "";
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!invitationId) {
    return { error: "invitationId required" };
  }
  if (!organizationId) {
    return { error: "organizationId required" };
  }
  return { invitationId, organizationId };
}

export async function POST(req: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseDeleteInvitationBody(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await deleteTeamInvitation({
      invitationId: parsed.invitationId,
      organizationId: parsed.organizationId,
      actorUserId: userId,
    });
  } catch (error) {
    if (error instanceof InvitationDeletionError) {
      const status = error.code === "forbidden" ? 403 : 404;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
