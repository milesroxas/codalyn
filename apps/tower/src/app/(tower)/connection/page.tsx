import { redirect } from "next/navigation";
import { TowerWebflowScreen } from "@/features/tower-ui/tower-webflow-screen";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";
import { resolveWebflowBeaconPublicConfig } from "@/server/webflow-beacon-public-config";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";

export const dynamic = "force-dynamic";

export default async function ConnectionPage() {
  const summary = await getTowerDashboardSummary({ includeWebflowSites: true });
  if (!summary.signedIn) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(TOWER_CONNECTION_PATH)}`);
  }

  const webflowBeaconPublicConfig = resolveWebflowBeaconPublicConfig();

  return (
    <TowerWebflowScreen
      summary={summary}
      oauthConfigured={hasWebflowOAuthCredentials()}
      {...webflowBeaconPublicConfig}
    />
  );
}
