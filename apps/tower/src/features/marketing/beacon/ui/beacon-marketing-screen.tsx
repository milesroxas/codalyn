import {
  BEACON_MARKETING_COPY,
  BEACON_MARKETING_FEATURE_ICONS,
  BEACON_MARKETING_FEATURES,
  type BeaconMarketingFeatureId,
} from "@/features/marketing/beacon/lib/beacon-marketing-content";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { CloudflareStreamVideo } from "@/shared/ui/cloudflare-stream-video";
import { MarketingFeatureRow } from "@/shared/ui/marketing-feature-row";
import { MarketingFeatureList, MarketingPageShell, MarketingProductHero } from "@/shared/ui/marketing-page-shell";

type BeaconMarketingScreenProps = {
  earlyAccessRequired?: boolean;
  appLinks?: TowerLandingAppLinks;
  navItems?: TowerPublicNavItem[] | null;
};

function BeaconMarketingScreen({ earlyAccessRequired = false, appLinks, navItems }: BeaconMarketingScreenProps) {
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
      activeProduct="beacon"
      beaconHref={beaconHref}
      flintHref={flintHref}
      signInHref={signInHref}
      primaryCtaHref={primaryCtaHref}
      primaryCtaLabel={primaryCtaLabel}
      towerHref={towerHref}
      navItems={navItems}
    >
      <MarketingProductHero
        align="center"
        title={BEACON_MARKETING_COPY.title}
        description={BEACON_MARKETING_COPY.description}
        media={
          <CloudflareStreamVideo
            uid={BEACON_MARKETING_COPY.heroVideo.streamUid}
            posterImageId={BEACON_MARKETING_COPY.heroVideo.posterImageId}
            label="Beacon product demo"
            className="mx-auto max-w-[60rem]"
          />
        }
      />
      <MarketingFeatureList>
        {BEACON_MARKETING_FEATURES.map((feature) => {
          const Icon = BEACON_MARKETING_FEATURE_ICONS[feature.id as BeaconMarketingFeatureId];
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
              videoStreamUid={feature.videoStreamUid}
              mediaShader={feature.mediaShader}
            />
          );
        })}
      </MarketingFeatureList>
    </MarketingPageShell>
  );
}

export { BeaconMarketingScreen };
