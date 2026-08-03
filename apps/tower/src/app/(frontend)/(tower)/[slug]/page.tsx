import type { Metadata } from "next";
import { draftMode, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { resolveCmsMedia } from "@/features/marketing/cms/lib/resolve-cms-media";
import { CmsPageScreen } from "@/features/marketing/cms/ui/cms-page-screen";
import { buildMarketingMetadata } from "@/server/marketing/marketing-seo";
import {
  buildMarketingUrl,
  buildTowerAppUrl,
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
  const page = await getCmsPageBySlug(slug, { draft });

  if (!page) {
    // Middleware lets slug-shaped paths through to this route; when no page
    // exists, deep links on the marketing host keep their pre-CMS behavior of
    // landing on the app host instead of a marketing 404.
    const host = normalizeHostname((await headers()).get("host") ?? "");
    if (isHostSplitEnabled() && isMarketingHost(host)) {
      redirect(buildTowerAppUrl(towerCmsPagePath(slug)));
    }
    notFound();
  }

  return <CmsPageScreen page={page} draft={draft} />;
}
