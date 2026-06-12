import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildWebflowOAuthFinishSignInUrl, finishStagedWebflowInstallOAuth } from "@/server/webflow-oauth-completion";
import { resolveWebflowOAuthAppUrl, WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE } from "@/server/webflow-oauth-config";
import { towerConnectionPathWithStatus } from "@/shared/lib/navigation/tower-app-paths";

export async function GET(request: Request) {
  const appUrl = resolveWebflowOAuthAppUrl();
  const cookieStore = await cookies();
  const pendingId = cookieStore.get(WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE)?.value?.trim() ?? "";
  cookieStore.delete(WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE);

  if (!pendingId) {
    return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("pending_expired")}`);
  }

  const result = await finishStagedWebflowInstallOAuth(request, pendingId);
  if (!result.ok) {
    if (result.error === "unauthorized") {
      return NextResponse.redirect(buildWebflowOAuthFinishSignInUrl(appUrl));
    }
    return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus(result.error)}`);
  }

  return NextResponse.redirect(`${appUrl}${towerConnectionPathWithStatus("connected")}`);
}
