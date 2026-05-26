import { TowerWorkspaceOnboardingBanner } from "@/features/tower-ui/tower-workspace-onboarding-banner";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";

export async function TowerWorkspaceOnboardingShell() {
  const summary = await getTowerDashboardSummary();
  if (!summary.signedIn) {
    return null;
  }

  return (
    <TowerWorkspaceOnboardingBanner
      summary={summary}
      billingEnabled={isTowerBillingEnabled()}
      oauthConfigured={hasWebflowOAuthCredentials()}
      includeWebflowConnect
    />
  );
}
