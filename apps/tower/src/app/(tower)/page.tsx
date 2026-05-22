import { TowerDashboard } from "@/features/tower-ui/tower-dashboard";
import { TowerLanding } from "@/features/tower-ui/tower-landing";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { getTowerDashboardSummary } from "@/server/dashboard-summary";

export default async function HomePage() {
  const summary = await getTowerDashboardSummary();

  if (summary.signedIn) {
    return <TowerDashboard summary={summary} />;
  }

  return <TowerLanding earlyAccessRequired={isTowerEarlyAccessGateEnabled()} />;
}
