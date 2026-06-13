import { useState } from "react";
import { readBeaconGuestChosen, writeBeaconGuestChosen } from "@/features/auth/lib/beacon-guest-choice";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";

/**
 * Visibility of the first-run login/welcome gate.
 *
 * The gate shows whenever the Tower session has resolved to no user — i.e. on every logged-out
 * load, not just the first ever. The only escape hatch is an explicit "Continue as guest", which is
 * remembered in memory for the current app load only (see beacon-guest-choice); a Designer refresh
 * or panel reopen brings the gate back. Signing in hides the gate purely via auth state
 * (`!towerUser`); it never records a dismissal, so signing out brings the gate straight back.
 */
export function useBeaconGuestWelcomeVisible() {
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const [guestChosen, setGuestChosen] = useState(readBeaconGuestChosen);
  const visible = !towerSessionPending && !towerUser && !guestChosen;

  const chooseGuest = () => {
    writeBeaconGuestChosen();
    setGuestChosen(true);
  };

  return { visible, chooseGuest, towerSessionPending, towerUser };
}
