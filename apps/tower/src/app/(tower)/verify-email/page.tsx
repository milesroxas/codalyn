"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  readEmailVerificationCallbackUrl,
  readEmailVerificationToken,
  VERIFY_EMAIL_PAGE_COPY,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = readEmailVerificationToken(searchParams);
  const callbackUrl = readEmailVerificationCallbackUrl(searchParams);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const verifyStartedRef = useRef(false);

  useEffect(() => {
    if (!token || verifyStartedRef.current) {
      return;
    }
    verifyStartedRef.current = true;

    void (async () => {
      const { error } = await authClient.verifyEmail({
        query: { token },
        fetchOptions: { credentials: "include" },
      });
      if (error) {
        setErrorMessage(error.message ?? VERIFY_EMAIL_PAGE_COPY.invalidTokenMessage);
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    })();
  }, [callbackUrl, router, token]);

  if (!token) {
    return (
      <AuthShell>
        <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {VERIFY_EMAIL_PAGE_COPY.pendingTitle}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {VERIFY_EMAIL_PAGE_COPY.invalidTokenMessage}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
            <p className="text-left text-sm text-muted-foreground">
              <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
                {VERIFY_EMAIL_PAGE_COPY.signInLabel}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </AuthShell>
    );
  }

  if (errorMessage) {
    return (
      <AuthShell>
        <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight">
              {VERIFY_EMAIL_PAGE_COPY.pendingTitle}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
            <p className="text-left text-sm text-muted-foreground">
              <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
                {VERIFY_EMAIL_PAGE_COPY.signInLabel}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">{VERIFY_EMAIL_PAGE_COPY.pendingTitle}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {VERIFY_EMAIL_PAGE_COPY.pendingDescription}
          </CardDescription>
        </CardHeader>
      </Card>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton variant="sign-in" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
