import { redirect } from "next/navigation";
import { TowerWebflowScreen } from "@/features/tower-ui/tower-webflow-screen";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";

export const dynamic = "force-dynamic";

export default async function ConnectionPage() {
  const summary = await getTowerDashboardSummary({ includeWebflowSites: true });
  if (!summary.signedIn) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(TOWER_CONNECTION_PATH)}`);
  }

  return (
    <TowerWebflowScreen
      summary={summary}
      oauthConfigured={hasWebflowOAuthCredentials()}
      billingEnabled={isTowerBillingEnabled()}
    />
  );
}
