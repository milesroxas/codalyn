import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { type ReactNode, useCallback, useState } from "react";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { resolveBeaconSiteLinkGateState } from "@/features/auth/lib/beacon-site-link-gate-state";
import { type BeaconCurrentSite, useBeaconCurrentSite } from "@/features/auth/lib/use-beacon-current-site";
import { TOWER_APP_ENTRY_PATH } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useTowerAppLink } from "@/features/auth/model/use-tower-app-link";
import { useWebflowAuthorizeLink } from "@/features/auth/model/use-webflow-authorize-link";
import { BeaconWorkspaceGateView } from "@/features/auth/ui/beacon-workspace-gate-view";
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

function siteLabelFor(site: BeaconCurrentSite): string {
  return site.siteName.trim() || site.siteId;
}

/**
 * Workspace step: the session holds no active Tower workspace, so Tower can neither list the sites
 * in the workspace's Webflow grant nor mint a consent URL. The user confirms the single workspace or
 * picks one; only that click persists anything (`POST /api/v1/beacon/active-workspace`, review round
 * 8). Tower then re-pulls settings and the gate re-evaluates: unlock, or the consent link below.
 */
function BeaconWorkspaceGate(props: { site: BeaconCurrentSite }) {
  const { site } = props;
  const { beaconWorkspaces, setActiveBeaconWorkspace, refreshBeaconSettings } = useBeaconAppSettings();
  const { clearStoredSession } = useBeaconTowerSession();
  const towerLinkProps = useTowerAppLink(TOWER_APP_ENTRY_PATH);
  // A successful confirmation triggers a settings re-pull, which flips the guard to its loading state
  // and unmounts this gate — so only a refused confirmation has to reset the selection here.
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectFailed, setSelectFailed] = useState(false);

  const onSelectWorkspace = useCallback(
    (organizationId: string) => {
      setSelectFailed(false);
      setSelectingId(organizationId);
      void setActiveBeaconWorkspace(organizationId).then((result) => {
        if (!result.ok) {
          setSelectingId(null);
          setSelectFailed(true);
        }
      });
    },
    [setActiveBeaconWorkspace]
  );

  return (
    <BeaconWorkspaceGateView
      siteLabel={siteLabelFor(site)}
      workspaces={beaconWorkspaces}
      selectingId={selectingId}
      selectFailed={selectFailed}
      towerLinkProps={towerLinkProps}
      onSelectWorkspace={onSelectWorkspace}
      onCheckAgain={refreshBeaconSettings}
      onSignOut={clearStoredSession}
    />
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

  return (
    <WebflowAuthorizeGateView
      siteLabel={siteLabelFor(site)}
      state={state}
      linkProps={linkProps}
      onRetry={retry}
      onSignOut={clearStoredSession}
    />
  );
}

/**
 * App-wide gate: once signed in to Tower, the user can't use any screen until the site currently open in
 * the Designer is part of the active workspace's Webflow Data API OAuth grant. Two steps, in order:
 *
 * 1. **Workspace** — an extension session starts with no active Tower workspace (Tower sets no default
 *    for bearer sessions, review round 8). Without one Tower can't list authorized sites or mint a
 *    consent URL, so the user confirms/picks a workspace here first.
 * 2. **Site authorization** — with a workspace active and the site outside its grant, the Webflow OAuth
 *    consent screen is linked directly (no Tower-side "authorize" page) so the user ticks the site there.
 *
 * It only gates when we KNOW the state — signed in, settings synced (authoritative `workspaces` /
 * `webflowSites`), and the current site resolved. Logged-out users (handled by the welcome gate), an
 * unresolved site, or an unsynced/offline pull fall through to `children`. The decision itself is the
 * pure `resolveBeaconSiteLinkGateState`.
 */
export function BeaconSiteLinkGuard(props: { children: ReactNode }) {
  const { user } = useBeaconTowerSession();
  const {
    webflowSites,
    beaconWorkspaces,
    hasActiveWorkspace,
    settingsPullPending,
    settingsPullSynced,
    refreshBeaconSettings,
  } = useBeaconAppSettings();
  const { site, ready } = useBeaconCurrentSite();

  const gate = resolveBeaconSiteLinkGateState({
    signedIn: Boolean(user),
    settingsPullPending,
    settingsPullSynced,
    siteReady: ready,
    siteId: site?.siteId ?? null,
    hasActiveWorkspace,
    workspaceCount: beaconWorkspaces.length,
    authorizedSiteIds: webflowSites === null ? null : webflowSites.map((entry) => entry.id),
  });

  if (gate === "pass") {
    return <>{props.children}</>;
  }

  if (gate === "loading" || site === null) {
    return (
      <div className={beaconAppRouteSurfaceClass}>
        <SiteLinkGateLoading />
      </div>
    );
  }

  return (
    <div className={beaconAppRouteSurfaceClass}>
      {gate === "authorize" ? (
        <WebflowAuthorizeGate site={site} onGrantCheck={refreshBeaconSettings} />
      ) : (
        <BeaconWorkspaceGate site={site} />
      )}
    </div>
  );
}
