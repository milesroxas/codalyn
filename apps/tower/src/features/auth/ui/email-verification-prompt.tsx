"use client";

import { IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  CHECK_EMAIL_PROMPT_COPY,
  EMAIL_VERIFICATION_BANNER_COPY,
  resolveTowerAppCallbackUrl,
  resolveTowerEmailVerificationCallbackUrl,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

type CheckEmailPromptProps = {
  email: string;
  callbackPath?: string;
  signInHref?: string;
};

export function CheckEmailPrompt({ email, callbackPath = "/", signInHref = "/sign-in" }: CheckEmailPromptProps) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const onResend = useCallback(async () => {
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: resolveTowerAppCallbackUrl(resolveTowerEmailVerificationCallbackUrl(callbackPath)),
      fetchOptions: { credentials: "include" },
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not send verification email");
      return;
    }
    setSent(true);
    toast.success(CHECK_EMAIL_PROMPT_COPY.resendSuccess);
  }, [callbackPath, email]);

  return (
    <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">{CHECK_EMAIL_PROMPT_COPY.title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{CHECK_EMAIL_PROMPT_COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{email}</span>
        </p>
        {sent ? (
          <p className="text-sm text-muted-foreground" role="status">
            {CHECK_EMAIL_PROMPT_COPY.resendSuccess}
          </p>
        ) : null}
        <Button type="button" size="form" width="full" disabled={pending} onClick={() => void onResend()}>
          {pending ? CHECK_EMAIL_PROMPT_COPY.resendPendingLabel : CHECK_EMAIL_PROMPT_COPY.resendLabel}
        </Button>
      </CardContent>
      <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
        <p className="text-left text-sm text-muted-foreground">
          <Link href={signInHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            {CHECK_EMAIL_PROMPT_COPY.signInLabel}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

type EmailVerificationResendButtonProps = {
  email: string;
  callbackPath?: string;
};

export function EmailVerificationResendButton({ email, callbackPath = "/" }: EmailVerificationResendButtonProps) {
  const [pending, setPending] = useState(false);

  const onResend = useCallback(async () => {
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: resolveTowerAppCallbackUrl(resolveTowerEmailVerificationCallbackUrl(callbackPath)),
      fetchOptions: { credentials: "include" },
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not send verification email");
      return;
    }
    toast.success(CHECK_EMAIL_PROMPT_COPY.resendSuccess);
  }, [callbackPath, email]);

  return (
    <Button type="button" variant="default" size="sm" disabled={pending} onClick={() => void onResend()}>
      {pending ? CHECK_EMAIL_PROMPT_COPY.resendPendingLabel : CHECK_EMAIL_PROMPT_COPY.resendLabel}
    </Button>
  );
}

type EmailVerificationBannerProps = {
  email: string;
};

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  return (
    <Alert variant="warning">
      <IconAlertCircle />
      <AlertTitle>{EMAIL_VERIFICATION_BANNER_COPY.title}</AlertTitle>
      <AlertDescription>
        {EMAIL_VERIFICATION_BANNER_COPY.description} Your address: {email}.
      </AlertDescription>
      <AlertAction>
        <EmailVerificationResendButton email={email} />
      </AlertAction>
    </Alert>
  );
}
