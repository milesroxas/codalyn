import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { ExternalLink, LogOut } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { type BeaconCurrentSite, useBeaconCurrentSite } from "@/features/auth/lib/use-beacon-current-site";
import { openWebflowOAuthAuthorize } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { Button } from "@/shared/ui/button";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";
import { ScrollArea } from "@/shared/ui/scroll-area";

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

/** Authorize-error code → a short, actionable message. `popup_blocked` is handled separately (no error UI). */
function messageForAuthorizeError(error: string): string {
  switch (error) {
    case "team_admin_required":
      return "Only a workspace admin can authorize sites in Webflow. Ask an admin to connect this site.";
    case "no_active_workspace":
      return "No active Tower workspace. Open Tower to select a workspace, then try again.";
    case "unauthorized":
      return "Your Tower session expired. Sign out and sign in again.";
    case "tower_unreachable":
      return "Couldn't reach Tower. Check your connection and try again.";
    default:
      return "Couldn't start Webflow authorization. Try again.";
  }
}

/**
 * Drives the Webflow OAuth consent popup for the current site. Opens it automatically on mount (the
 * login click is the gesture) and offers a button to (re)open if the browser blocked it or the user
 * closed it without granting. On popup close it refetches Tower state via `onClosed` — if the site was
 * granted, the surrounding guard unmounts this and the app unlocks.
 */
function WebflowAuthorizeGate(props: { site: BeaconCurrentSite; onClosed: () => void }) {
  const { site, onClosed } = props;
  const { clearStoredSession } = useBeaconTowerSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);
  const siteLabel = site.siteName.trim() || site.siteId;

  const open = useCallback(() => {
    setBusy(true);
    setError(null);
    void openWebflowOAuthAuthorize(onClosed)
      .then((result) => {
        // popup_blocked just means the browser needs an explicit click — surface the button, not an error.
        if (!result.ok && result.error !== "popup_blocked") {
          setError(messageForAuthorizeError(result.error));
        }
      })
      .finally(() => setBusy(false));
  }, [onClosed]);

  // Auto-open once: the popup appears right after login without an extra click when the browser allows it.
  useEffect(() => {
    if (autoOpenedRef.current) {
      return;
    }
    autoOpenedRef.current = true;
    open();
  }, [open]);

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-foreground">
            Authorize <span className="font-medium">{siteLabel}</span> in the Webflow window to continue.
          </p>
          {error ? <p className="text-xs leading-snug text-destructive">{error}</p> : null}
          <Button type="button" className="w-full" disabled={busy} aria-busy={busy} onClick={open}>
            <ExternalLink aria-hidden data-icon="inline-start" />
            {busy ? "Opening Webflow…" : "Open Webflow authorization"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-center text-[11px] text-muted-foreground"
            onClick={clearStoredSession}
          >
            <LogOut aria-hidden data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

/**
 * App-wide gate: once signed in to Tower, the user can't use any screen until the site currently open in
 * the Designer is part of the workspace's Webflow Data API OAuth grant. When it isn't, the Webflow OAuth
 * consent popup is driven directly (no Tower-side "authorize" page) so the user ticks the site there.
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
        <WebflowAuthorizeGate site={site} onClosed={refreshBeaconSettings} />
      </div>
    );
  }

  return <>{props.children}</>;
}
