import { useCallback, useState } from "react";
import { clearBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";

/**
 * Outcome of a failed inline exchange:
 * - "tower-sign-in": we can't establish a session here (no Webflow connection, Tower unreachable, no
 *   token issued, or anything unexpected). Forget any stale token and open Tower sign-in to authenticate.
 * - "redirect": send the user to a specific Tower route (e.g. early-access request).
 * - "toast": a Designer-local issue the popup can't fix — surface the reason in place.
 */
type SignInFailureAction =
  | { kind: "tower-sign-in" }
  | { kind: "redirect"; path: string }
  | { kind: "toast"; message: string };

/** Maps an exchange failure code to the right Designer-visible response. */
function resolveSignInFailureAction(error: string): SignInFailureAction {
  switch (error) {
    case "early_access_required":
      return { kind: "redirect", path: "/request-access" };
    case "get_id_token_failed":
      return { kind: "toast", message: "Couldn't read your Webflow identity. Reload the Designer and try again." };
    case "id_token_resolve_failed":
      return { kind: "toast", message: "Webflow couldn't verify your Designer session. Try again in a moment." };
    case "tower_not_configured":
      return { kind: "toast", message: "Tower isn't configured for this extension build." };
    // No Webflow connection, Tower unreachable, no session issued, or any unmapped failure: we can't
    // establish a session inline, so open Tower sign-in rather than dead-ending on a toast.
    default:
      return { kind: "tower-sign-in" };
  }
}

/**
 * Inline Designer sign-in for CTA buttons: mints a Tower bearer from the Webflow ID token without a popup.
 * On failure it either redirects to Tower (early access, or no Webflow connection → Tower sign-in) or
 * surfaces the reason inline; it never silently opens a popup.
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
        const action = resolveSignInFailureAction(result.error);
        if (action.kind === "tower-sign-in") {
          // Drop any stale stored token so the app stops treating us as signed in and the Tower tab
          // opens a clean /sign-in (no dead one-time-token handoff). Signing in there lets the next
          // attempt — or the on-focus silent exchange — establish a real session.
          clearBeaconTowerSessionToken();
          openTowerAppPath("/sign-in");
          return;
        }
        if (action.kind === "redirect") {
          openTowerAppPath(action.path);
          return;
        }
        void webflow.notify({ type: "Error", message: action.message });
      })
      .finally(() => {
        setPending(false);
      });
  }, [signInWithDesignerSession]);

  return { signIn, pending };
}
