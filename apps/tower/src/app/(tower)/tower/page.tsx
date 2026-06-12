import { headers } from "next/headers";

import { TowerMarketingScreen } from "@/features/marketing/tower/ui/tower-marketing-screen";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";
import { buildTowerLandingAppLinks, normalizeHostname } from "@/server/tower-hosts";

export const dynamic = "force-dynamic";

export const metadata = createMarketingPageMetadata("tower");

export default async function TowerMarketingPage() {
  const host = normalizeHostname((await headers()).get("host") ?? "");
  const earlyAccessRequired = isTowerEarlyAccessGateEnabled();
  const appLinks = buildTowerLandingAppLinks(host);

  return <TowerMarketingScreen earlyAccessRequired={earlyAccessRequired} appLinks={appLinks} />;
}
