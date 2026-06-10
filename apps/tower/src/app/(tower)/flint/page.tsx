import { headers } from "next/headers";

import { FlintMarketingScreen } from "@/features/marketing/flint/ui/flint-marketing-screen";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";
import { buildTowerLandingAppLinks, normalizeHostname } from "@/server/tower-hosts";

export const dynamic = "force-dynamic";

export const metadata = createMarketingPageMetadata("flint");

export default async function FlintPage() {
  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") ?? "");

  return (
    <FlintMarketingScreen
      earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
      appLinks={buildTowerLandingAppLinks(host)}
    />
  );
}
