import { Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { messageForWebflowSignInError } from "@/features/auth/lib/webflow-sign-in-error";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { Button } from "@/shared/ui/button";

export const WEBFLOW_SIGN_IN_LABEL = "Continue with Webflow";

/**
 * Explicit, user-initiated Webflow sign-in: the documented hybrid-app path
 * (`webflow.getIdToken()` → Tower `POST /beta/token/resolve` → Tower session), run on a click.
 *
 * The same exchange runs silently when the extension loads, but a Tower sign-out (or a reaped
 * session) suppresses that silent run for good so the user is not signed straight back in. Without
 * this button the only way back was an email + password — which a Tower account provisioned from
 * the Designer does not have (observed 2026-09-22). No window is opened and nothing is stored: the
 * Tower bearer stays in memory, as after the silent exchange.
 * @see https://developers.webflow.com/data-beta/docs/authenticating-users-with-id-tokens
 */
export function BeaconWebflowSignInButton() {
  const { signInWithWebflow } = useBeaconTowerSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setPending(true);
    const result = await signInWithWebflow();
    setPending(false);
    if (result.ok) {
      void webflow.notify({ type: "Success", message: "Signed in to Tower." });
      return;
    }
    setError(messageForWebflowSignInError(result.error));
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" className="w-full" onClick={onClick} disabled={pending} aria-busy={pending}>
        {pending ? (
          <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" />
        ) : (
          <LogIn aria-hidden data-icon="inline-start" />
        )}
        {pending ? "Signing in…" : WEBFLOW_SIGN_IN_LABEL}
      </Button>
      {error ? (
        <p className="text-xs leading-snug text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
