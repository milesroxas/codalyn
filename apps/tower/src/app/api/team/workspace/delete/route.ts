import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { deleteWorkspace } from "@/server/membership/delete-workspace";
import { workspaceDeleteErrorResponse } from "@/server/membership/workspace-delete-http";
import { assertWorkspaceDeleteRateLimit } from "@/server/security/destructive-action-rate-limit";

export const dynamic = "force-dynamic";

type DeleteWorkspaceBody = {
  organizationId?: unknown;
  confirmSlug?: unknown;
};

function parseDeleteWorkspaceBody(raw: unknown): { organizationId: string; confirmSlug: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as DeleteWorkspaceBody;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const confirmSlug = typeof body.confirmSlug === "string" ? body.confirmSlug : "";
  if (!organizationId) {
    return { error: "organizationId required" };
  }
  if (!confirmSlug.trim()) {
    return { error: "confirmSlug required" };
  }
  return { organizationId, confirmSlug };
}

/**
 * Team workspace admin: permanently delete a workspace after slug confirmation.
 * Members lose access; user accounts are not deleted.
 */
export async function POST(req: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseDeleteWorkspaceBody(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await assertWorkspaceDeleteRateLimit(userId);
    await deleteWorkspace({
      organizationId: parsed.organizationId,
      confirmSlug: parsed.confirmSlug,
      actorUserId: userId,
    });
  } catch (error) {
    const response = workspaceDeleteErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
