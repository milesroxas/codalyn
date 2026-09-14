import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import type { ReactNode } from "react";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { type BeaconCurrentSite, useBeaconCurrentSite } from "@/features/auth/lib/use-beacon-current-site";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useWebflowAuthorizeLink } from "@/features/auth/model/use-webflow-authorize-link";
import { WebflowAuthorizeGateView } from "@/features/auth/ui/webflow-authorize-gate-view";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";

function SiteLinkGateLoading() {
  const show = useDeferredLoadingIndicator(true);
  if (!show) {
    return null;
  }
  return (
    <RouteLoadingSurface layout="route" role="status" aria-live="polite" data-slot="beacon_site_link_gate_loading">
      <BeaconRouteLoadingStatus ariaLabel="Checking site access…" message="Checking site access…" />
    </RouteLoadingSurface>
  );
}

/**
 * Drives the Webflow OAuth consent link for the current site. The authorize URL is minted when this
 * mounts (never on a timer, never opened automatically) and rendered as an ordinary new-tab link —
 * the extension spawns no windows (Marketplace popup guidance). After the click, Tower state is
 * re-read on a bounded interval and when the Designer tab regains visibility (`onGrantCheck`); once
 * the site is granted, the surrounding guard unmounts this and the app unlocks.
 */
function WebflowAuthorizeGate(props: { site: BeaconCurrentSite; onGrantCheck: () => void }) {
  const { site, onGrantCheck } = props;
  const { clearStoredSession } = useBeaconTowerSession();
  const { state, linkProps, retry } = useWebflowAuthorizeLink(onGrantCheck);
  const siteLabel = site.siteName.trim() || site.siteId;

  return (
    <WebflowAuthorizeGateView
      siteLabel={siteLabel}
      state={state}
      linkProps={linkProps}
      onRetry={retry}
      onSignOut={clearStoredSession}
    />
  );
}

/**
 * App-wide gate: once signed in to Tower, the user can't use any screen until the site currently open in
 * the Designer is part of the workspace's Webflow Data API OAuth grant. When it isn't, the Webflow OAuth
 * consent screen is linked directly (no Tower-side "authorize" page) so the user ticks the site there.
 *
 * It only gates when we KNOW the site is unauthorized — signed in, settings synced (authoritative
 * `webflowSites`), and the current site resolved. Logged-out users (handled by the welcome gate), an
 * unresolved site, or an unsynced/offline pull fall through to `children`.
 */
export function BeaconSiteLinkGuard(props: { children: ReactNode }) {
  const { user } = useBeaconTowerSession();
  const { webflowSites, settingsPullPending, settingsPullSynced, refreshBeaconSettings } = useBeaconAppSettings();
  const { site, ready } = useBeaconCurrentSite();

  // Logged-out users are handled by the welcome/sign-in gate inside the routes.
  if (!user) {
    return <>{props.children}</>;
  }

  // Still determining authorization (initial Tower pull or current-site resolution): block interaction.
  if (settingsPullPending || !ready) {
    return (
      <div className={beaconAppRouteSurfaceClass}>
        <SiteLinkGateLoading />
      </div>
    );
  }

  // Couldn't verify the grant (Tower unreachable/errored) or couldn't resolve the current site: don't
  // lock the user out — fall through. Data-API features degrade on their own without authorization.
  if (!settingsPullSynced || site === null) {
    return <>{props.children}</>;
  }

  const currentSiteAuthorized = (webflowSites ?? []).some((entry) => entry.id.trim() === site.siteId);
  if (!currentSiteAuthorized) {
    return (
      <div className={beaconAppRouteSurfaceClass}>
        <WebflowAuthorizeGate site={site} onGrantCheck={refreshBeaconSettings} />
      </div>
    );
  }

  return <>{props.children}</>;
}
