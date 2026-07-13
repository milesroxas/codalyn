import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { resolveCmsMedia } from "@/features/marketing/cms/lib/resolve-cms-media";
import { CmsPageHero } from "@/features/marketing/cms/ui/blocks/page-hero";
import { RenderBlocks } from "@/features/marketing/cms/ui/blocks/render-blocks";
import type { Page } from "@/payload-types";
import { auth } from "@/server/auth";
import { Card, CardContent } from "@/shared/ui/card";
import { RichTextContent } from "@/shared/ui/rich-text-content";
import {
  TowerMarketingPublicPageBody,
  towerMarketingPublicPageFooterRegionClassName,
} from "@/shared/ui/tower-marketing-public-page-body";
import {
  TowerPageHeader,
  TowerPageMain,
  towerAuthenticatedLegalPageShellClassName,
} from "@/shared/ui/tower-page-shell";
import { TowerPublicFooter } from "@/shared/ui/tower-public-footer";

type CmsPageScreenProps = {
  page: Page;
  /** Rendering inside Next.js draft mode — shows the exit-preview banner. */
  draft: boolean;
};

function DraftBanner({ slug }: { slug: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500/90 px-4 py-2 text-sm font-medium text-black">
      <span>Previewing draft</span>
      <Link
        className="underline underline-offset-4"
        href={`/api/cms/exit-preview?slug=${encodeURIComponent(slug)}`}
        prefetch={false}
      >
        Exit preview
      </Link>
    </div>
  );
}

async function CmsPageScreen({ page, draft }: CmsPageScreenProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const authenticated = Boolean(session?.user);

  const heroImage = resolveCmsMedia(page.hero?.image);

  // Block-based pages lead with the hero group then their layout sections;
  // legacy pages fall back to the page-header + rich text body below.
  const body = page.layout?.length ? (
    <TowerPageMain width="wide" className="min-h-0 flex-1">
      <CmsPageHero hero={page.hero} />
      <RenderBlocks blocks={page.layout} />
    </TowerPageMain>
  ) : (
    <TowerPageMain width="narrow" className="min-h-0 flex-1">
      <TowerPageHeader title={page.hero?.heading || page.title} description={page.hero?.subheading ?? ""} />
      {heroImage?.url && heroImage.width && heroImage.height ? (
        <Image
          src={heroImage.url}
          alt={heroImage.alt}
          width={heroImage.width}
          height={heroImage.height}
          className="mb-8 h-auto w-full rounded-lg"
          priority
        />
      ) : null}
      {page.content ? (
        <Card>
          <CardContent>
            <RichTextContent data={page.content} />
          </CardContent>
        </Card>
      ) : null}
      <footer className="mt-8">
        <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/">
          Back to home
        </Link>
      </footer>
    </TowerPageMain>
  );

  const banner = draft ? <DraftBanner slug={page.slug} /> : null;

  if (authenticated) {
    return (
      <div className={towerAuthenticatedLegalPageShellClassName()}>
        {banner}
        <div className="flex min-h-0 flex-1 flex-col">{body}</div>
        <div className={towerMarketingPublicPageFooterRegionClassName()}>
          <TowerPublicFooter variant="default" />
        </div>
      </div>
    );
  }

  return (
    <TowerMarketingPublicPageBody footerVariant="marketing">
      {banner}
      {body}
    </TowerMarketingPublicPageBody>
  );
}

export { CmsPageScreen };
