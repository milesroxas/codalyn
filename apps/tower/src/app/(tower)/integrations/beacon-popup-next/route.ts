import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/shared/lib/db";
import { webflowOAuthToken } from "@/shared/lib/db/auth-schema";

/**
 * After Tower email sign-in in the Beacon popup: continue to Webflow OAuth only if this user
 * has no stored Data API token yet.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const rows = await db
    .select({ accessToken: webflowOAuthToken.accessToken })
    .from(webflowOAuthToken)
    .where(eq(webflowOAuthToken.userId, session.user.id))
    .limit(1);

  const hasToken = Boolean(rows[0]?.accessToken?.trim());
  if (hasToken) {
    return NextResponse.redirect(new URL("/integrations/beacon-popup-done", request.url));
  }

  return NextResponse.redirect(new URL("/api/integrations/webflow/authorize", request.url));
}
