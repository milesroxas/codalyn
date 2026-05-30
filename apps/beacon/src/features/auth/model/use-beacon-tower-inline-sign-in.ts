import { useCallback, useState } from "react";
import { openTowerAppPath, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";

/**
 * Inline Designer sign-in for CTA buttons: mints a Tower bearer from the Webflow ID token without a popup.
 * Falls back to Tower only when the exchange genuinely fails (e.g. early-access gate or unavailable ID token);
 * returning to the Designer then re-runs the exchange automatically.
 */
export function useBeaconTowerInlineSignIn(): { signIn: () => void; pending: boolean } {
  const { signInWithDesignerSession } = useBeaconTowerSession();
  const [pending, setPending] = useState(false);

  const signIn = useCallback(() => {
    setPending(true);
    void signInWithDesignerSession()
      .then((result) => {
        if (result.ok) {
          return;
        }
        if (result.error === "early_access_required") {
          openTowerAppPath("/request-access");
          return;
        }
        openTowerAuthPopup("/sign-in");
      })
      .finally(() => {
        setPending(false);
      });
  }, [signInWithDesignerSession]);

  return { signIn, pending };
}
