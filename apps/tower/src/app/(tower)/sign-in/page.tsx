"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  syncExistingTowerSessionToBeaconIfPopup,
  tryFinishBeaconTowerAuthPopup,
} from "@/features/auth/lib/beacon-opener-auth";
import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";
import {
  isEmailNotVerifiedAuthError,
  resolveTowerAppCallbackUrl,
  resolveTowerEmailVerificationCallbackUrl,
} from "@/features/auth/lib/email-verification";
import { messageForRedeemFailure, redeemOperatorInviteClient } from "@/features/auth/lib/operator-invite-client";
import {
  PASSWORD_RESET_QUERY,
  RESET_PASSWORD_COPY,
  readPasswordResetSuccess,
} from "@/features/auth/lib/password-reset";
import { resolveUserAndTokenAfterEmailAuth, userToBeaconPayload } from "@/features/auth/lib/resolve-email-auth-session";
import { resolvePostAuthRedirectTarget } from "@/features/auth/lib/resolve-post-auth-redirect";
import { authClient } from "@/features/auth/model/auth-client";
import { useRedirectAuthenticatedFromAuthSurface } from "@/features/auth/model/use-redirect-authenticated-from-auth-surface";
import { CheckEmailPrompt } from "@/features/auth/ui/email-verification-prompt";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type SignInPostResult =
  | { kind: "beacon_popup" }
  | { kind: "error"; message: string }
  | { kind: "done"; user: Awaited<ReturnType<typeof resolveUserAndTokenAfterEmailAuth>>["user"] };

async function runAfterTowerSignIn(opts: {
  data: Parameters<typeof resolveUserAndTokenAfterEmailAuth>[0];
  beaconOrigin: string | null;
  operatorInviteToken: string | null;
}): Promise<SignInPostResult> {
  const { user: u, token } = await resolveUserAndTokenAfterEmailAuth(opts.data);
  if (tryFinishBeaconTowerAuthPopup(opts.beaconOrigin, u ? userToBeaconPayload(u) : undefined, token)) {
    return { kind: "beacon_popup" };
  }
  if (opts.operatorInviteToken && !opts.beaconOrigin) {
    const redeemResult = await redeemOperatorInviteClient(opts.operatorInviteToken);
    if (redeemResult !== "ok") {
      return { kind: "error", message: messageForRedeemFailure(redeemResult) };
    }
  }
  return { kind: "done", user: u };
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeRelativePath(searchParams.get("callbackUrl") ?? "/");
  const beaconOrigin = searchParams.get("beaconOrigin");
  const operatorInviteParam = searchParams.get("invite");
  const { sessionPending, redirecting: redirectingSignedInUser } = useRedirectAuthenticatedFromAuthSurface({
    callbackUrl,
    beaconOrigin,
  });
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [earlyAccessRequired, setEarlyAccessRequired] = useState(false);
  const [awaitingVerificationEmail, setAwaitingVerificationEmail] = useState<string | null>(null);
  const passwordResetNotifiedRef = useRef(false);

  const authSearchParams = {
    beaconOrigin,
    invite: operatorInviteParam,
  };
  const signUpHref = buildTowerAuthSurfaceHref("/sign-up", callbackUrl, authSearchParams);
  const forgotPasswordHref = buildTowerAuthSurfaceHref("/forgot-password", callbackUrl, authSearchParams);
  const signInHref = buildTowerAuthSurfaceHref("/sign-in", callbackUrl, authSearchParams);

  useEffect(() => {
    if (passwordResetNotifiedRef.current || !readPasswordResetSuccess(searchParams)) {
      return;
    }
    passwordResetNotifiedRef.current = true;
    toast.success(RESET_PASSWORD_COPY.successMessage);
    const url = new URL(window.location.href);
    url.searchParams.delete(PASSWORD_RESET_QUERY);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/access-policy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { earlyAccessRequired?: boolean } | null) => {
        if (!cancelled) {
          setEarlyAccessRequired(Boolean(data?.earlyAccessRequired));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEarlyAccessRequired(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!operatorInviteParam || beaconOrigin) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/account/operator-invite-details?token=${encodeURIComponent(operatorInviteParam)}`, {
        credentials: "same-origin",
      });
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setError("This invite link is invalid or expired.");
        return;
      }
      const data = (await res.json().catch(() => null)) as { email?: string } | null;
      if (data?.email) {
        setEmail(data.email);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [operatorInviteParam, beaconOrigin]);

  useEffect(() => {
    if (!beaconOrigin) {
      return;
    }
    void syncExistingTowerSessionToBeaconIfPopup(beaconOrigin);
  }, [beaconOrigin]);

  if (sessionPending || redirectingSignedInUser) {
    return <AuthCardSkeleton variant="sign-in" />;
  }

  if (awaitingVerificationEmail) {
    return (
      <AuthShell>
        <CheckEmailPrompt email={awaitingVerificationEmail} callbackPath={callbackUrl} signInHref={signInHref} />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const verificationCallback = resolveTowerAppCallbackUrl(resolveTowerEmailVerificationCallbackUrl(callbackUrl));
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
      callbackURL: verificationCallback,
    });
    setPending(false);
    if (err) {
      if (isEmailNotVerifiedAuthError(err)) {
        setAwaitingVerificationEmail(email);
        return;
      }
      setError(err.message ?? "Sign in failed");
      return;
    }
    const post = await runAfterTowerSignIn({
      data,
      beaconOrigin,
      operatorInviteToken: operatorInviteParam?.trim() || null,
    });
    if (post.kind === "beacon_popup") {
      return;
    }
    if (post.kind === "error") {
      setError(post.message);
      return;
    }
    if (post.kind === "done" && post.user) {
      router.push(resolvePostAuthRedirectTarget(post.user, callbackUrl));
      router.refresh();
    }
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {earlyAccessRequired
              ? "Sign in with your Tower email and password. Early access is required while Tower is in MVP."
              : "Sign in with your Tower email and password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormField>
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
              />
            </FormField>
            <FormField>
              <Label htmlFor={passwordId}>Password</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
              />
            </FormField>
            <p className="-mt-2 text-right text-sm">
              <Link
                href={forgotPasswordHref}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} size="form" width="full">
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          {earlyAccessRequired ? (
            <p className="text-left text-sm text-muted-foreground">
              Need access?{" "}
              <Link
                href={`/request-access?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Request early access
              </Link>
            </p>
          ) : (
            <p className="text-left text-sm text-muted-foreground">
              No account?{" "}
              <Link href={signUpHref} className="font-medium text-foreground underline-offset-4 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton variant="sign-in" />}>
      <SignInForm />
    </Suspense>
  );
}
