"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useId, useState } from "react";
import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";
import { FORGOT_PASSWORD_COPY, resolveTowerPasswordResetRedirectUrl } from "@/features/auth/lib/password-reset";
import { authClient } from "@/features/auth/model/auth-client";
import { useRedirectAuthenticatedFromAuthSurface } from "@/features/auth/model/use-redirect-authenticated-from-auth-surface";
import { PasswordResetCheckEmailPrompt } from "@/features/auth/ui/password-reset-prompt";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeRelativePath(searchParams.get("callbackUrl") ?? "/");
  const beaconOrigin = searchParams.get("beaconOrigin");
  const { sessionPending, redirecting: redirectingSignedInUser } = useRedirectAuthenticatedFromAuthSurface({
    callbackUrl,
    beaconOrigin,
  });
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const authSearchParams = {
    beaconOrigin,
  };
  const signInHref = buildTowerAuthSurfaceHref("/sign-in", callbackUrl, authSearchParams);

  const authBusy = sessionPending || redirectingSignedInUser;
  const showAuthSkeleton = useDeferredLoadingIndicator(authBusy);
  if (showAuthSkeleton) {
    return <AuthCardSkeleton variant="sign-in" />;
  }
  if (authBusy) {
    return null;
  }

  if (submittedEmail) {
    return (
      <AuthShell>
        <PasswordResetCheckEmailPrompt email={submittedEmail} callbackPath={callbackUrl} signInHref={signInHref} />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: resolveTowerPasswordResetRedirectUrl(callbackUrl),
      fetchOptions: { credentials: "include" },
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Could not send reset link");
      return;
    }
    setSubmittedEmail(email);
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">{FORGOT_PASSWORD_COPY.title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">{FORGOT_PASSWORD_COPY.description}</CardDescription>
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
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} size="form" width="full">
              {pending ? FORGOT_PASSWORD_COPY.submitPendingLabel : FORGOT_PASSWORD_COPY.submitLabel}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-left text-sm text-muted-foreground">
            <Link href={signInHref} className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <AuthCardSkeleton variant="sign-in" />
        </TowerDeferredLoadingFallback>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
