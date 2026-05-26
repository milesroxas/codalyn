import { redirect } from "next/navigation";
import { TowerWebflowScreen } from "@/features/tower-ui/tower-webflow-screen";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";

export const dynamic = "force-dynamic";

export default async function WebflowPage() {
  const summary = await getTowerDashboardSummary({ includeWebflowSites: true });
  if (!summary.signedIn) {
    redirect("/sign-in?callbackUrl=/webflow");
  }

  return (
    <TowerWebflowScreen
      summary={summary}
      oauthConfigured={hasWebflowOAuthCredentials()}
      billingEnabled={isTowerBillingEnabled()}
    />
  );
}
