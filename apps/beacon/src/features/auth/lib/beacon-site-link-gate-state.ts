/**
 * Pure decision for the app-wide site gate (`BeaconSiteLinkGuard`): given what the Designer and Tower
 * have told us, which surface should replace the route content?
 *
 * Tower keys a Designer session's Webflow Data API access on the session's *active workspace* — and
 * an extension (bearer) session gets no workspace until the user confirms one (Marketplace review
 * round 8, "Workspace state persisted without explicit user interaction"). Until then Tower cannot
 * list authorized sites (`webflowSites` is `null`) and cannot mint an OAuth authorize URL
 * (`no_active_workspace`), so "no workspace yet" must be its own state, asked for before the site's
 * authorization is judged. Treating it as "site not authorized" sends the user to a consent link that
 * can never be minted (observed 2026-09-22 on the 09-22 build).
 */
export type BeaconSiteLinkGateInput = {
  /** A Tower user is signed in (session resolved). */
  signedIn: boolean;
  /** Initial Tower settings pull still in flight. */
  settingsPullPending: boolean;
  /** The Tower settings pull succeeded, so workspace and site lists are authoritative. */
  settingsPullSynced: boolean;
  /** `webflow.getSiteInfo()` has been attempted. */
  siteReady: boolean;
  /** The site open in the Designer, `null` when the Designer API could not resolve it. */
  siteId: string | null;
  /** The session holds an active Tower workspace. */
  hasActiveWorkspace: boolean;
  /** Workspaces the user belongs to. */
  workspaceCount: number;
  /** Sites in the active workspace's Webflow OAuth grant; `null` when Tower has no token to list them. */
  authorizedSiteIds: readonly string[] | null;
};

export type BeaconSiteLinkGateState =
  /** Render the routes. */
  | "pass"
  /** Block with a loading surface: authorization is still being determined. */
  | "loading"
  /** The user belongs to workspaces but none is active on this session: ask them to confirm/pick one. */
  | "choose_workspace"
  /** The user belongs to no Tower workspace at all: point them to Tower. */
  | "no_workspace"
  /** A workspace is active and the current site is not in its Webflow grant: offer the consent link. */
  | "authorize";

export function resolveBeaconSiteLinkGateState(input: BeaconSiteLinkGateInput): BeaconSiteLinkGateState {
  // Logged-out users are handled by the welcome/sign-in gate inside the routes.
  if (!input.signedIn) {
    return "pass";
  }
  // Still determining authorization (initial Tower pull or current-site resolution): block interaction.
  if (input.settingsPullPending || !input.siteReady) {
    return "loading";
  }
  // Couldn't verify the grant (Tower unreachable/errored) or couldn't resolve the current site: don't
  // lock the user out — fall through. Data-API features degrade on their own without authorization.
  if (!input.settingsPullSynced || input.siteId === null) {
    return "pass";
  }
  if (!input.hasActiveWorkspace) {
    return input.workspaceCount > 0 ? "choose_workspace" : "no_workspace";
  }
  const siteId = input.siteId.trim();
  const authorized = (input.authorizedSiteIds ?? []).some((id) => id.trim() === siteId);
  return authorized ? "pass" : "authorize";
}
