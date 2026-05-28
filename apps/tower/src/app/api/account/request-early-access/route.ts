import { NextResponse } from "next/server";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { submitEarlyAccessRequest } from "@/server/access/early-access-request";
import { parseEarlyAccessRequestNameBody } from "@/shared/lib/access/early-access-request-name";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { parseEarlyAccessReferralRequestInput } from "@/shared/lib/access/referral-source";

export async function POST(req: Request) {
  if (!isTowerEarlyAccessGateEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    referralSource?: unknown;
    referralOther?: unknown;
  } | null;

  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const referral = parseEarlyAccessReferralRequestInput({
    referralSource: body?.referralSource,
    referralOther: body?.referralOther,
  });
  if ("error" in referral) {
    return NextResponse.json({ error: referral.error }, { status: 400 });
  }

  const { firstName, lastName } = parseEarlyAccessRequestNameBody({
    firstName: body?.firstName,
    lastName: body?.lastName,
  });

  try {
    const outcome = await submitEarlyAccessRequest({ email, firstName, lastName, note: referral.note });
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    if (error instanceof Error && error.message === "gate_disabled") {
      return NextResponse.json({ error: "not_available" }, { status: 404 });
    }
    throw error;
  }
}
