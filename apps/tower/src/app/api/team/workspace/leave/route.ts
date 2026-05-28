import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { leaveWorkspace, WorkspaceLeaveError } from "@/server/membership/leave-workspace";

export const dynamic = "force-dynamic";

type LeaveWorkspaceBody = {
  organizationId?: unknown;
};

function parseLeaveWorkspaceBody(raw: unknown): { organizationId: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as LeaveWorkspaceBody;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!organizationId) {
    return { error: "organizationId required" };
  }
  return { organizationId };
}

function leaveWorkspaceStatus(code: WorkspaceLeaveError["code"]): number {
  switch (code) {
    case "not_found":
    case "not_member":
      return 404;
    case "workspace_owner":
    case "billing_owner":
    case "forbidden":
      return 403;
    default:
      return 400;
  }
}

export async function POST(req: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseLeaveWorkspaceBody(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await leaveWorkspace({ organizationId: parsed.organizationId, actorUserId: userId });
  } catch (error) {
    if (error instanceof WorkspaceLeaveError) {
      return NextResponse.json({ error: error.code }, { status: leaveWorkspaceStatus(error.code) });
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
