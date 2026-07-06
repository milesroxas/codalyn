import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { deleteWorkspace } from "@/server/membership/delete-workspace";
import { parseOwnerWorkspaceDeleteBody, workspaceDeleteErrorResponse } from "@/server/membership/workspace-delete-http";
import { assertWorkspaceDeleteRateLimit } from "@/server/security/destructive-action-rate-limit";

export const dynamic = "force-dynamic";

/** Workspace owner: soft-delete workspace after slug confirmation and password re-authentication. */
export async function POST(req: Request): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseOwnerWorkspaceDeleteBody(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await assertWorkspaceDeleteRateLimit(userId);
    await deleteWorkspace({
      organizationId: parsed.organizationId,
      confirmSlug: parsed.confirmSlug,
      password: parsed.password,
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
