import { Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerAccessPolicy } from "@/features/auth/model/use-beacon-tower-access-policy";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

/**
 * Email + password Tower sign-in, inline in the Designer (no popup). Use this for users who already
 * have a Tower account but haven't connected Webflow — the one-click Webflow sign-in can't resolve a
 * session for them. After signing in they can link the current site via the connect popup.
 */
export function BeaconTowerSignInForm() {
  const { signInWithEmail } = useBeaconTowerSession();
  const { earlyAccessRequired } = useBeaconTowerAccessPolicy();
  // Early access gate on (or unknown): account creation is invite-only, so hide "Create account".
  const publicSignUpOpen = earlyAccessRequired === false;
  const emailId = useId();
  const passwordId = useId();
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
        <Label htmlFor={passwordId}>Password</Label>
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
      <div className="flex items-center justify-center gap-2 text-xs">
        {publicSignUpOpen ? (
          <>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={() => openTowerAppPath("/sign-up")}
            >
              Create account
            </Button>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
          </>
        ) : null}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs"
          onClick={() => openTowerAppPath("/forgot-password")}
        >
          Forgot password?
        </Button>
      </div>
    </form>
  );
}
