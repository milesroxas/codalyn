import { headers } from "next/headers";
import { TowerDashboard } from "@/features/tower-ui/tower-dashboard";
import { TowerLanding } from "@/features/tower-ui/tower-landing";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";
import { buildTowerLandingAppLinks, isMarketingHost, normalizeHostname } from "@/server/tower-hosts";

export default async function HomePage() {
  const host = normalizeHostname((await headers()).get("host") ?? "");
  const earlyAccessRequired = isTowerEarlyAccessGateEnabled();

  if (isMarketingHost(host)) {
    return <TowerLanding earlyAccessRequired={earlyAccessRequired} appLinks={buildTowerLandingAppLinks()} />;
  }

  const summary = await getTowerDashboardSummary();

  if (summary.signedIn) {
    return <TowerDashboard summary={summary} />;
  }

  return <TowerLanding earlyAccessRequired={earlyAccessRequired} />;
}
