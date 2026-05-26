import { headers } from "next/headers";
import { TowerDashboard } from "@/features/tower-ui/tower-dashboard";
import { TowerLanding } from "@/features/tower-ui/tower-landing";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
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
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const userId = session?.user?.id;
    if (!userId) {
      return <TowerLanding earlyAccessRequired={earlyAccessRequired} />;
    }

    const activeOrg = await getActiveOrganizationIdForAuthHeaders(h);
    const usage = await fetchEndUserUsageStatus(userId, activeOrg);

    return <TowerDashboard summary={summary} usage={usage} billingEnabled={isTowerBillingEnabled()} />;
  }

  return <TowerLanding earlyAccessRequired={earlyAccessRequired} />;
}
