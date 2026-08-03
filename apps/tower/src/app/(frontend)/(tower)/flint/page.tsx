import { draftMode, headers } from "next/headers";

import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { getTowerHeaderNavItems } from "@/features/marketing/cms/lib/get-header-nav";
import { CmsMarketingScreen } from "@/features/marketing/cms/ui/cms-marketing-screen";
import { FlintMarketingScreen } from "@/features/marketing/flint/ui/flint-marketing-screen";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { createMarketingPageMetadata } from "@/server/marketing/marketing-seo";
import { buildTowerLandingAppLinks, normalizeHostname } from "@/server/tower-hosts";

export const dynamic = "force-dynamic";

export const metadata = createMarketingPageMetadata("flint");

export default async function FlintPage() {
  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") ?? "");
  const { isEnabled: draft } = await draftMode();
  const [navItems, cmsPage] = await Promise.all([getTowerHeaderNavItems(host), getCmsPageBySlug("flint", { draft })]);

  // A published CMS page with the product slug replaces the static screen.
  if (cmsPage) {
    return (
      <CmsMarketingScreen
        page={cmsPage}
        draft={draft}
        activeProduct="flint"
        earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
        appLinks={buildTowerLandingAppLinks(host)}
        navItems={navItems}
      />
    );
  }

  return (
    <FlintMarketingScreen
      earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
      appLinks={buildTowerLandingAppLinks(host)}
      navItems={navItems}
    />
  );
}
