"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useId, useState } from "react";
import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";
import {
  isInvalidPasswordResetToken,
  PASSWORD_RESET_QUERY,
  RESET_PASSWORD_COPY,
  readPasswordResetToken,
} from "@/features/auth/lib/password-reset";
import { authClient } from "@/features/auth/model/auth-client";
import { useRedirectAuthenticatedFromAuthSurface } from "@/features/auth/model/use-redirect-authenticated-from-auth-surface";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeRelativePath(searchParams.get("callbackUrl") ?? "/");
  const token = readPasswordResetToken(searchParams);
  const invalidToken = isInvalidPasswordResetToken(searchParams);
  const { sessionPending, redirecting: redirectingSignedInUser } = useRedirectAuthenticatedFromAuthSurface({
    callbackUrl,
  });
  const passwordId = useId();
  const confirmPasswordId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signInHref = buildTowerAuthSurfaceHref("/sign-in", callbackUrl, { [PASSWORD_RESET_QUERY]: "1" });
  const forgotPasswordHref = buildTowerAuthSurfaceHref("/forgot-password", callbackUrl);

  const authBusy = sessionPending || redirectingSignedInUser;
  const showAuthSkeleton = useDeferredLoadingIndicator(authBusy);
  if (showAuthSkeleton) {
    return <AuthCardSkeleton variant="sign-in" />;
  }
  if (authBusy) {
    return null;
  }

  if (invalidToken || !token) {
    return (
      <AuthShell>
        <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight">{RESET_PASSWORD_COPY.title}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {RESET_PASSWORD_COPY.invalidTokenMessage}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
            <p className="text-left text-sm text-muted-foreground">
              <Link
                href={forgotPasswordHref}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {RESET_PASSWORD_COPY.requestNewLinkLabel}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </AuthShell>
    );
  }

  const resetToken = token;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }
    setPending(true);
    const { error: err } = await authClient.resetPassword({
      newPassword: password,
      token: resetToken,
      fetchOptions: { credentials: "include" },
    });
    setPending(false);
    if (err) {
      setError(err.message ?? RESET_PASSWORD_COPY.invalidTokenMessage);
      return;
    }
    router.push(signInHref);
    router.refresh();
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">{RESET_PASSWORD_COPY.title}</CardTitle>
          <CardDescription className="text-base leading-relaxed">{RESET_PASSWORD_COPY.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormField>
              <Label htmlFor={passwordId}>New password</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
                minLength={8}
              />
            </FormField>
            <FormField>
              <Label htmlFor={confirmPasswordId}>Confirm password</Label>
              <Input
                id={confirmPasswordId}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                fieldSize="lg"
                surface="elevated"
                required
                minLength={8}
              />
            </FormField>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} size="form" width="full">
              {pending ? RESET_PASSWORD_COPY.submitPendingLabel : RESET_PASSWORD_COPY.submitLabel}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <AuthCardSkeleton variant="sign-in" />
        </TowerDeferredLoadingFallback>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
