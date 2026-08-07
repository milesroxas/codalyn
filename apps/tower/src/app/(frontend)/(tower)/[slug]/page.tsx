import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { getTowerHeaderNavItems } from "@/features/marketing/cms/lib/get-header-nav";
import { resolveCmsMedia } from "@/features/marketing/cms/lib/resolve-cms-media";
import { CmsMarketingScreen } from "@/features/marketing/cms/ui/cms-marketing-screen";
import { CmsPageScreen } from "@/features/marketing/cms/ui/cms-page-screen";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { auth } from "@/server/auth";
import { buildMarketingMetadata } from "@/server/marketing/marketing-seo";
import {
  buildMarketingUrl,
  buildTowerAppUrl,
  buildTowerLandingAppLinks,
  isHostSplitEnabled,
  isMarketingHost,
  normalizeHostname,
} from "@/server/tower-hosts";
import { towerCmsPagePath } from "@/shared/lib/navigation/tower-marketing-paths";

export const dynamic = "force-dynamic";

type Args = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const page = await getCmsPageBySlug(slug, { draft });
  if (!page) {
    return {};
  }

  const metadata = buildMarketingMetadata({
    title: page.seo?.title || page.title,
    description: page.seo?.description || page.hero?.subheading || "",
    canonicalUrl: buildMarketingUrl(towerCmsPagePath(page.slug)),
  });

  const seoImage = resolveCmsMedia(page.seo?.image);
  if (seoImage?.url) {
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: seoImage.url, alt: seoImage.alt }] };
  }

  return metadata;
}

export default async function CmsRootPage({ params }: Args) {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const requestHeaders = await headers();
  const host = normalizeHostname(requestHeaders.get("host") ?? "");
  const page = await getCmsPageBySlug(slug, { draft });

  if (!page) {
    // Middleware lets slug-shaped paths through to this route; when no page
    // exists, deep links on the marketing host keep their pre-CMS behavior of
    // landing on the app host instead of a marketing 404.
    if (isHostSplitEnabled() && isMarketingHost(host)) {
      redirect(buildTowerAppUrl(towerCmsPagePath(slug)));
    }
    notFound();
  }

  // Logged-out visitors get the same self-contained marketing chrome as the
  // product pages (dark shell + CMS header nav); TowerAppShell renders no
  // chrome for CMS root paths. Signed-in visitors keep the app chrome via
  // CmsPageScreen's authenticated shell.
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    const navItems = await getTowerHeaderNavItems(host);
    return (
      <CmsMarketingScreen
        page={page}
        draft={draft}
        earlyAccessRequired={isTowerEarlyAccessGateEnabled()}
        appLinks={buildTowerLandingAppLinks(host)}
        navItems={navItems}
      />
    );
  }

  return <CmsPageScreen page={page} draft={draft} />;
}
