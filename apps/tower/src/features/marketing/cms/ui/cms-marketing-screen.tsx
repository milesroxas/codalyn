import { CmsPageHero } from "@/features/marketing/cms/ui/blocks/page-hero";
import { RenderBlocks } from "@/features/marketing/cms/ui/blocks/render-blocks";
import { DraftBanner } from "@/features/marketing/cms/ui/cms-page-screen";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import type { Page } from "@/payload-types";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { MarketingPageShell } from "@/shared/ui/marketing-page-shell";

type CmsMarketingScreenProps = {
  page: Page;
  /** Rendering inside Next.js draft mode — shows the exit-preview banner. */
  draft: boolean;
  activeProduct?: "beacon" | "tower" | "flint";
  earlyAccessRequired?: boolean;
  appLinks?: TowerLandingAppLinks;
  navItems?: TowerPublicNavItem[] | null;
};

/**
 * A Payload-driven page rendered with the top-level marketing chrome
 * (public header + footer). Used when a CMS page replaces one of the static
 * product marketing routes (`/beacon`, `/tower`, `/flint`).
 */
function CmsMarketingScreen({
  page,
  draft,
  activeProduct,
  earlyAccessRequired = false,
  appLinks,
  navItems,
}: CmsMarketingScreenProps) {
  const signInHref = appLinks?.signIn ?? "/sign-in";
  const signUpHref = appLinks?.signUp ?? "/sign-up";
  const requestAccessHref = appLinks?.requestAccess ?? "/request-access";
  const primaryCtaHref = earlyAccessRequired ? requestAccessHref : signUpHref;
  const primaryCtaLabel = earlyAccessRequired ? "Early Access" : "Sign up";

  return (
    <MarketingPageShell
      activeProduct={activeProduct}
      beaconHref={appLinks?.beacon ?? "/beacon"}
      flintHref={appLinks?.flint ?? "/flint"}
      towerHref={appLinks?.tower ?? TOWER_PRODUCT_MARKETING_PATH}
      signInHref={signInHref}
      primaryCtaHref={primaryCtaHref}
      primaryCtaLabel={primaryCtaLabel}
      navItems={navItems}
    >
      {draft ? <DraftBanner slug={page.slug} /> : null}
      <CmsPageHero hero={page.hero} />
      {page.layout?.length ? <RenderBlocks blocks={page.layout} /> : null}
    </MarketingPageShell>
  );
}

export { CmsMarketingScreen };
