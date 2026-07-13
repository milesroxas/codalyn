import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import { getCmsPageBySlug } from "@/features/marketing/cms/lib/get-cms-page";
import { resolveCmsMedia } from "@/features/marketing/cms/lib/resolve-cms-media";
import { CmsPageScreen } from "@/features/marketing/cms/ui/cms-page-screen";
import { buildMarketingMetadata } from "@/server/marketing/marketing-seo";
import { buildMarketingUrl } from "@/server/tower-hosts";
import { TOWER_CMS_PAGE_PATH_PREFIX } from "@/shared/lib/navigation/tower-marketing-paths";

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
    canonicalUrl: buildMarketingUrl(`${TOWER_CMS_PAGE_PATH_PREFIX}/${page.slug}`),
  });

  const seoImage = resolveCmsMedia(page.seo?.image);
  if (seoImage?.url) {
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: seoImage.url, alt: seoImage.alt }] };
  }

  return metadata;
}

export default async function CmsPage({ params }: Args) {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const page = await getCmsPageBySlug(slug, { draft });

  if (!page) {
    notFound();
  }

  return <CmsPageScreen page={page} draft={draft} />;
}
