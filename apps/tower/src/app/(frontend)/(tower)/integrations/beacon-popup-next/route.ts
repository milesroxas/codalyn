import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { canTowerUserManageWebflowOAuthViaDashboard } from "@/server/tower-webflow-oauth-team-admin";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";

/**
 * After Tower email sign-in in the Beacon popup: continue to Webflow OAuth only if this user
 * is a workspace admin and the active workspace has no stored Data API token yet.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in?callbackUrl=%2Fintegrations%2Fbeacon-popup-next", request.url));
  }

  const token = await resolveWebflowBearerToken({ userId: session.user.id, requestHeaders: request.headers });
  if (token) {
    return NextResponse.redirect(new URL("/integrations/beacon-popup-done", request.url));
  }

  const canManage = await canTowerUserManageWebflowOAuthViaDashboard(session.user.id, request.headers);
  if (!canManage) {
    return NextResponse.redirect(new URL("/integrations/beacon-popup-done", request.url));
  }

  return NextResponse.redirect(new URL("/api/integrations/webflow/authorize", request.url));
}
