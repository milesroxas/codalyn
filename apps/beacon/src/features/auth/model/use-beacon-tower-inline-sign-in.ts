import { useCallback, useState } from "react";
import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";

/** Maps an exchange failure code to a Designer-visible message; returns null when the caller should redirect instead. */
function describeSignInFailure(error: string): string | null {
  switch (error) {
    case "early_access_required":
      return null;
    case "get_id_token_failed":
      return "Couldn't read your Webflow identity. Reload the Designer and try again.";
    case "webflow_resolve_bearer_missing":
      return "Tower can't verify Webflow accounts yet. Connect Webflow on Tower (or set a Data API token), then try again.";
    case "id_token_resolve_failed":
      return "Webflow couldn't verify your Designer session. Try again in a moment.";
    case "tower_not_configured":
      return "Tower isn't configured for this extension build.";
    default:
      return `Couldn't sign in to Tower (${error}).`;
  }
}

/**
 * Inline Designer sign-in for CTA buttons: mints a Tower bearer from the Webflow ID token without a popup.
 * On failure it surfaces the reason (early-access redirects to Tower); it never silently opens a popup.
 */
export function useBeaconTowerInlineSignIn(): { signIn: () => void; pending: boolean } {
  const { signInWithDesignerSession } = useBeaconTowerSession();
  const [pending, setPending] = useState(false);

  const signIn = useCallback(() => {
    setPending(true);
    void signInWithDesignerSession()
      .then((result) => {
        if (result.ok) {
          void webflow.notify({ type: "Success", message: "Signed in to Tower." });
          return;
        }
        const message = describeSignInFailure(result.error);
        if (!message) {
          openTowerAppPath("/request-access");
          return;
        }
        void webflow.notify({ type: "Error", message });
      })
      .finally(() => {
        setPending(false);
      });
  }, [signInWithDesignerSession]);

  return { signIn, pending };
}
