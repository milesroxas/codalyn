import { FLINT_MARKETING_COPY } from "@/features/marketing/flint/lib/flint-marketing-content";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { MarketingBetaGroupPanel } from "@/shared/ui/marketing-beta-group-panel";
import { MarketingPageShell, MarketingProductHero } from "@/shared/ui/marketing-page-shell";

type FlintMarketingScreenProps = {
  earlyAccessRequired?: boolean;
  appLinks?: TowerLandingAppLinks;
  navItems?: TowerPublicNavItem[] | null;
};

function FlintMarketingScreen({ earlyAccessRequired = false, appLinks, navItems }: FlintMarketingScreenProps) {
  const signInHref = appLinks?.signIn ?? "/sign-in";
  const signUpHref = appLinks?.signUp ?? "/sign-up";
  const requestAccessHref = appLinks?.requestAccess ?? "/request-access";
  const primaryCtaHref = earlyAccessRequired ? requestAccessHref : signUpHref;
  const primaryCtaLabel = earlyAccessRequired ? "Early Access" : "Sign up";
  const towerHref = appLinks?.tower ?? TOWER_PRODUCT_MARKETING_PATH;
  const beaconHref = appLinks?.beacon ?? "/beacon";
  const flintHref = appLinks?.flint ?? "/flint";

  return (
    <MarketingPageShell
      activeProduct="flint"
      beaconHref={beaconHref}
      flintHref={flintHref}
      signInHref={signInHref}
      primaryCtaHref={primaryCtaHref}
      primaryCtaLabel={primaryCtaLabel}
      towerHref={towerHref}
      navItems={navItems}
    >
      <MarketingProductHero title={FLINT_MARKETING_COPY.title} description={FLINT_MARKETING_COPY.description} />
      <MarketingBetaGroupPanel
        title={FLINT_MARKETING_COPY.betaGroup.title}
        description={FLINT_MARKETING_COPY.betaGroup.description}
      />
    </MarketingPageShell>
  );
}

export { FlintMarketingScreen };
