import { draftMode, headers } from "next/headers";

import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { getTowerHeaderNavItems } from "@/features/marketing/cms/lib/get-header-nav";
import { CmsMarketingScreen } from "@/features/marketing/cms/ui/cms-marketing-screen";
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
  const { isEnabled: draft } = await draftMode();
  const [navItems, cmsPage] = await Promise.all([getTowerHeaderNavItems(host), getCmsPageBySlug("tower", { draft })]);

  // A published CMS page with the product slug replaces the static screen.
  if (cmsPage) {
    return (
      <CmsMarketingScreen
        page={cmsPage}
        draft={draft}
        activeProduct="tower"
        earlyAccessRequired={earlyAccessRequired}
        appLinks={appLinks}
        navItems={navItems}
      />
    );
  }

  return <TowerMarketingScreen earlyAccessRequired={earlyAccessRequired} appLinks={appLinks} navItems={navItems} />;
}
