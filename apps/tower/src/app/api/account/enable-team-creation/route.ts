import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

/**
 * Legacy signup helper — workspace creation no longer requires pre-enabling an account flag.
 * Kept for backward-compatible signup / Beacon flows that still POST here.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
