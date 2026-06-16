import type React from "react";
import { type FormEvent, useId, useState } from "react";
import { useFlintTower } from "@/features/auth/model/flint-tower-provider";
import { Button } from "@/shared/ui/button";

const FIELD_CLASS =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-[11px] leading-snug outline-none focus-visible:border-ring";

/**
 * Email + password Tower sign-in, inline in the Designer (no popup). For users who already have a Tower
 * account but haven't connected Webflow — the one-click Webflow sign-in can't resolve a session for them.
 */
export const FlintTowerSignInForm: React.FC = () => {
  const { signInWithEmail } = useFlintTower();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    void signInWithEmail(email, password)
      .then((result) => {
        if (result.ok) {
          void webflow.notify({ type: "Success", message: "Signed in to Tower." });
          return;
        }
        setError(result.error);
      })
      .finally(() => setPending(false));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="space-y-1">
        <label htmlFor={emailId} className="text-[11px] font-medium text-foreground">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          className={FIELD_CLASS}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={passwordId} className="text-[11px] font-medium text-foreground">
          Password
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          className={FIELD_CLASS}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          required
        />
      </div>
      {error && (
        <p className="text-[11px] leading-snug text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
};
