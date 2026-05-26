import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { submitSupportRequest } from "@/server/support/support-request";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    kind?: unknown;
    topic?: unknown;
    details?: unknown;
    email?: unknown;
  } | null;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  try {
    const result = await submitSupportRequest({
      kind: body?.kind,
      topic: body?.topic,
      details: body?.details,
      email: body?.email,
      userId,
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "invalid_kind" ||
        error.message === "invalid_email" ||
        error.message === "invalid_topic" ||
        error.message === "invalid_details"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    throw error;
  }
}
