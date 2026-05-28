import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  approveEarlyAccessRequest,
  dismissEarlyAccessRequest,
  getEarlyAccessRequestInviteLink,
  resendEarlyAccessRequestApproval,
} from "@/server/access/early-access-request";
import { auth } from "@/server/auth";
import { isTowerProductAdmin } from "@/server/membership/product-admin";

type RouteContext = { params: Promise<{ id: string }> };

const EARLY_ACCESS_REQUEST_ACTION_ERRORS: Record<string, number> = {
  not_found: 404,
  not_pending: 409,
  not_approved: 409,
  decline_reason_required: 400,
};

function earlyAccessApprovalActionJson(result: Awaited<ReturnType<typeof resendEarlyAccessRequestApproval>>) {
  if (result.kind === "new_user") {
    return { ok: true as const, kind: result.kind, inviteUrl: result.inviteUrl };
  }
  return { ok: true as const, kind: result.kind, signInUrl: result.signInUrl };
}

function earlyAccessRequestActionErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const status = EARLY_ACCESS_REQUEST_ACTION_ERRORS[error.message];
  if (!status) {
    return null;
  }
  return NextResponse.json({ error: error.message }, { status });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !isTowerProductAdmin(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; declineReason?: unknown } | null;
  const action = body?.action;
  const declineReason = typeof body?.declineReason === "string" ? body.declineReason.trim() : "";

  const inviterLabel = session.user.name?.trim() || session.user.email || "A Tower operator";

  try {
    if (action === "approve") {
      const result = await approveEarlyAccessRequest(id, session.user.id, inviterLabel);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "dismiss") {
      if (!declineReason) {
        return NextResponse.json({ error: "decline_reason_required" }, { status: 400 });
      }
      await dismissEarlyAccessRequest(id, session.user.id, declineReason);
      return NextResponse.json({ ok: true });
    }
    if (action === "resend_approval") {
      const result = await resendEarlyAccessRequestApproval(id, inviterLabel);
      return NextResponse.json(earlyAccessApprovalActionJson(result));
    }
    if (action === "invite_link") {
      const result = await getEarlyAccessRequestInviteLink(id, inviterLabel);
      return NextResponse.json(earlyAccessApprovalActionJson(result));
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    const response = earlyAccessRequestActionErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }
}
