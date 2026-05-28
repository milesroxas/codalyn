import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { planUserAccountDeletion } from "@/server/membership/user-account-deletion";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await planUserAccountDeletion(session.user.id);

  return NextResponse.json({
    canDelete: plan.blockers.length === 0,
    blockers: plan.blockers,
  });
}
