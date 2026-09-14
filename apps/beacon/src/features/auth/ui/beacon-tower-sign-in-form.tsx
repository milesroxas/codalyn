import { Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useBeaconTowerAccessPolicy } from "@/features/auth/model/use-beacon-tower-access-policy";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useTowerAppLink } from "@/features/auth/model/use-tower-app-link";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

/**
 * Email + password Tower sign-in, inline in the Designer (no popup). Use this for users who already
 * have a Tower account but haven't connected Webflow — the one-click Webflow sign-in can't resolve a
 * session for them. After signing in they can link the current site via the connect link.
 */
export function BeaconTowerSignInForm() {
  const { signInWithEmail } = useBeaconTowerSession();
  const { earlyAccessRequired } = useBeaconTowerAccessPolicy();
  // Early access gate on (or unknown): account creation is invite-only, so hide "Create account".
  const publicSignUpOpen = earlyAccessRequired === false;
  const emailId = useId();
  const passwordId = useId();
  // Tower account routes open as ordinary new-tab links (never `window.open`).
  const forgotPasswordLink = useTowerAppLink("/forgot-password");
  const signUpLink = useTowerAppLink("/sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await signInWithEmail(email, password);
    setPending(false);
    if (result.ok) {
      void webflow.notify({ type: "Success", message: "Signed in to Tower." });
      return;
    }
    setError(result.error);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId}>Password</Label>
          {forgotPasswordLink ? (
            <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
              <a {...forgotPasswordLink}>Forgot password?</a>
            </Button>
          ) : null}
        </div>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      {error ? (
        <p className="text-xs leading-snug text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {publicSignUpOpen && signUpLink ? (
        <div className="flex items-center justify-center text-xs">
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
            <a {...signUpLink}>Create account</a>
          </Button>
        </div>
      ) : null}
    </form>
  );
}
