import { NextResponse } from "next/server";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { submitEarlyAccessRequest } from "@/server/access/early-access-request";
import { parseAccessEmailInput, parseTeamMemberEmailsInput } from "@/shared/lib/access/email-input";

export async function POST(req: Request) {
  if (!isTowerEarlyAccessGateEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    note?: unknown;
    teamMemberEmails?: unknown;
  } | null;

  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const teamMemberEmails = parseTeamMemberEmailsInput(body?.teamMemberEmails, { excludeEmail: email });
  if (teamMemberEmails === null) {
    return NextResponse.json({ error: "invalid_team_email" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name : undefined;
  const note = typeof body?.note === "string" ? body.note : undefined;

  try {
    const outcome = await submitEarlyAccessRequest({ email, name, note, teamMemberEmails });
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    if (error instanceof Error && error.message === "gate_disabled") {
      return NextResponse.json({ error: "not_available" }, { status: 404 });
    }
    throw error;
  }
}
