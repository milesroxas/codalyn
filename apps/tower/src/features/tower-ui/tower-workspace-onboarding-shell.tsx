import { TowerWorkspaceOnboardingBanner } from "@/features/tower-ui/tower-workspace-onboarding-banner";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getTowerOnboardingBannerSummary } from "@/server/tower-onboarding-banner-summary";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";

export async function TowerWorkspaceOnboardingShell() {
  const summary = await getTowerOnboardingBannerSummary();
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
