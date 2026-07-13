import { headers } from "next/headers";

import { TowerBeaconScreen } from "@/features/beacon/ui/tower-beacon-screen";
import { BeaconMarketingScreen } from "@/features/marketing/beacon/ui/beacon-marketing-screen";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { auth } from "@/server/auth";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";
import { buildTowerLandingAppLinks, normalizeHostname, shouldServeBeaconMarketingPage } from "@/server/tower-hosts";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";

export const dynamic = "force-dynamic";

export const metadata = createMarketingPageMetadata("beacon");

export default async function BeaconPage() {
  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") ?? "");
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (shouldServeBeaconMarketingPage(host, Boolean(session?.user))) {
    return (
      <BeaconMarketingScreen
        earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
        appLinks={buildTowerLandingAppLinks(host)}
      />
    );
  }

  return <TowerBeaconScreen oauthConfigured={hasWebflowOAuthCredentials()} />;
}
