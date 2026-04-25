import { resolveUserAndTokenAfterEmailAuth, userToBeaconPayload } from "./resolve-email-auth-session";

/** Minimal user payload posted to Beacon after popup sign-in (cross-origin cookies not available in Designer iframe). */
export type BeaconTowerAuthMessageUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

/**
 * When the popup loads with an existing Tower session cookie (e.g. user signed in on Tower earlier)
 * but Beacon has no bearer in storage, hand off the current session the same way as after email sign-in.
 */
export async function syncExistingTowerSessionToBeaconIfPopup(beaconOrigin: string | null): Promise<void> {
  if (!beaconOrigin || typeof window === "undefined" || !window.opener) {
    return;
  }
  const { user: u, token } = await resolveUserAndTokenAfterEmailAuth(null);
  tryFinishBeaconTowerAuthPopup(beaconOrigin, u ? userToBeaconPayload(u) : undefined, token);
}

/**
 * If this window was opened as a Beacon auth popup, notify opener then continue only when
 * Webflow OAuth is still needed (see `/integrations/beacon-popup-next`).
 * @returns true when the popup took over navigation
 */
export function tryFinishBeaconTowerAuthPopup(
  beaconOrigin: string | null,
  user: BeaconTowerAuthMessageUser | undefined,
  sessionToken: string | undefined
): boolean {
  if (!beaconOrigin || typeof window === "undefined" || !window.opener || !user || !sessionToken) {
    return false;
  }
  window.opener.postMessage({ type: "codalyn:tower-auth", status: "success", user, token: sessionToken }, beaconOrigin);
  window.location.assign("/integrations/beacon-popup-next");
  return true;
}
