import { useState } from "react";
import {
  readBeaconGuestWelcomeComplete,
  writeBeaconGuestWelcomeComplete,
} from "@/features/auth/lib/beacon-guest-welcome-preference";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";

/** True when the first-run guest welcome should show (no Tower user, session resolved, preference unset). */
export function useBeaconGuestWelcomeVisible() {
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const [guestWelcomeDone, setGuestWelcomeDone] = useState(readBeaconGuestWelcomeComplete);
  const visible = !towerSessionPending && !towerUser && !guestWelcomeDone;

  const markGuestWelcomeComplete = () => {
    writeBeaconGuestWelcomeComplete();
    setGuestWelcomeDone(true);
  };

  return { visible, markGuestWelcomeComplete, towerSessionPending, towerUser };
}
