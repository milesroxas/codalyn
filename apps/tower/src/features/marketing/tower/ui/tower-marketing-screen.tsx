import {
  TOWER_MARKETING_COPY,
  TOWER_MARKETING_FEATURE_ICONS,
  TOWER_MARKETING_FEATURES,
  type TowerMarketingFeatureId,
} from "@/features/marketing/tower/lib/tower-marketing-content";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { MarketingFeatureRow } from "@/shared/ui/marketing-feature-row";
import { MarketingFeatureList, MarketingPageShell, MarketingProductHero } from "@/shared/ui/marketing-page-shell";

type TowerMarketingScreenProps = {
  navItems?: TowerPublicNavItem[] | null;
  earlyAccessRequired?: boolean;
  appLinks?: TowerLandingAppLinks;
};

function TowerMarketingScreen({ earlyAccessRequired = false, appLinks, navItems }: TowerMarketingScreenProps) {
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
      activeProduct="tower"
      beaconHref={beaconHref}
      flintHref={flintHref}
      signInHref={signInHref}
      primaryCtaHref={primaryCtaHref}
      primaryCtaLabel={primaryCtaLabel}
      towerHref={towerHref}
      navItems={navItems}
    >
      <MarketingProductHero title={TOWER_MARKETING_COPY.title} description={TOWER_MARKETING_COPY.description} />
      <MarketingFeatureList>
        {TOWER_MARKETING_FEATURES.map((feature) => {
          const Icon = TOWER_MARKETING_FEATURE_ICONS[feature.id as TowerMarketingFeatureId];
          return (
            <MarketingFeatureRow
              key={feature.id}
              accent={feature.accent}
              icon={<Icon aria-hidden stroke={1.5} />}
              mediaPosition={feature.mediaPosition}
              roles={feature.roles}
              title={feature.title}
              videoLabel={`${feature.title} demo`}
              videoPoster={feature.videoPoster}
              videoSrc={feature.videoSrc}
              mediaShader={feature.mediaShader}
            />
          );
        })}
      </MarketingFeatureList>
    </MarketingPageShell>
  );
}

export { TowerMarketingScreen };
