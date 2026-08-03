import { draftMode, headers } from "next/headers";

import { TowerBeaconScreen } from "@/features/beacon/ui/tower-beacon-screen";
import { BeaconMarketingScreen } from "@/features/marketing/beacon/ui/beacon-marketing-screen";
import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { getTowerHeaderNavItems } from "@/features/marketing/cms/lib/get-header-nav";
import { CmsMarketingScreen } from "@/features/marketing/cms/ui/cms-marketing-screen";
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
    const { isEnabled: draft } = await draftMode();
    const [navItems, cmsPage] = await Promise.all([
      getTowerHeaderNavItems(host),
      getCmsPageBySlug("beacon", { draft }),
    ]);

    // A published CMS page with the product slug replaces the static screen.
    if (cmsPage) {
      return (
        <CmsMarketingScreen
          page={cmsPage}
          draft={draft}
          activeProduct="beacon"
          earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
          appLinks={buildTowerLandingAppLinks(host)}
          navItems={navItems}
        />
      );
    }

    return (
      <BeaconMarketingScreen
        earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
        appLinks={buildTowerLandingAppLinks(host)}
        navItems={navItems}
      />
    );
  }

  return <TowerBeaconScreen oauthConfigured={hasWebflowOAuthCredentials()} />;
}
