"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useId, useState } from "react";
import { tryFinishBeaconTowerAuthPopup } from "@/features/auth/lib/beacon-opener-auth";
import { resolveUserAndTokenAfterEmailAuth, userToBeaconPayload } from "@/features/auth/lib/resolve-email-auth-session";
import { authClient } from "@/features/auth/model/auth-client";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const inputClass = "h-10 rounded-lg bg-background/80 dark:bg-input/40";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const beaconOrigin = searchParams.get("beaconOrigin");
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
      ...(beaconOrigin ? {} : { callbackURL: callbackUrl }),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Sign in failed");
      return;
    }
    const { user: u, token } = await resolveUserAndTokenAfterEmailAuth(data);
    if (tryFinishBeaconTowerAuthPopup(beaconOrigin, u ? userToBeaconPayload(u) : undefined, token)) {
      return;
    }
    if (data?.user) {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Sign in with your Tower email and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={passwordId}>Password</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className={inputClass}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="h-10 w-full rounded-lg font-medium">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        </AuthShell>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
