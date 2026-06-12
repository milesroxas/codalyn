import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  dismissFlintBetaGroupRequest,
  resolveFlintBetaGroupRequest,
} from "@/server/marketing/flint-beta-group-request";
import { isTowerProductAdmin } from "@/server/membership/product-admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !isTowerProductAdmin(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; operatorNote?: unknown } | null;
  const action = body?.action;
  const operatorNote = typeof body?.operatorNote === "string" ? body.operatorNote : null;

  try {
    if (action === "resolve") {
      await resolveFlintBetaGroupRequest(id, session.user.id, operatorNote);
      return NextResponse.json({ ok: true });
    }
    if (action === "dismiss") {
      await dismissFlintBetaGroupRequest(id, session.user.id, operatorNote);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "not_found") {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (error.message === "not_pending") {
        return NextResponse.json({ error: "not_pending" }, { status: 409 });
      }
    }
    throw error;
  }
}
