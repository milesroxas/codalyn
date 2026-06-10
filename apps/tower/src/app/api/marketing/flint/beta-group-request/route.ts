import { NextResponse } from "next/server";
import { submitFlintBetaGroupRequest } from "@/server/marketing/flint-beta-group-request";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
  } | null;

  try {
    const outcome = await submitFlintBetaGroupRequest({
      email: body?.email,
      firstName: body?.firstName,
      lastName: body?.lastName,
    });
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_email") {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    throw error;
  }
}
