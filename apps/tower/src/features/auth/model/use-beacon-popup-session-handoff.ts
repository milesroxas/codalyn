"use client";

import { useEffect } from "react";
import { syncExistingTowerSessionToBeaconIfPopup } from "@/features/auth/lib/beacon-opener-auth";
import { readSessionEmailVerified } from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";

/** When Tower opens as a Beacon auth popup, hand off session once cookies + client session are ready. */
export function useBeaconPopupSessionHandoff(beaconOrigin: string | null): void {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  useEffect(() => {
    if (!beaconOrigin || sessionPending || !session?.user || !readSessionEmailVerified(session.user)) {
      return;
    }
    void syncExistingTowerSessionToBeaconIfPopup(beaconOrigin);
  }, [beaconOrigin, sessionPending, session?.user]);
}
