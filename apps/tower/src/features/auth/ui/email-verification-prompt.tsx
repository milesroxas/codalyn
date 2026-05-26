"use client";

import { IconAlertCircle } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  CHECK_EMAIL_PROMPT_COPY,
  EMAIL_VERIFICATION_BANNER_COPY,
  resolveTowerAppCallbackUrl,
  resolveTowerEmailVerificationCallbackUrl,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { AuthCheckEmailCard } from "@/features/auth/ui/auth-check-email-card";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type CheckEmailPromptProps = {
  email: string;
  callbackPath?: string;
  signInHref?: string;
};

export function CheckEmailPrompt({ email, callbackPath = "/", signInHref = "/sign-in" }: CheckEmailPromptProps) {
  const onResend = useCallback(async () => {
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: resolveTowerAppCallbackUrl(resolveTowerEmailVerificationCallbackUrl(callbackPath)),
      fetchOptions: { credentials: "include" },
    });
    return { error: error?.message ?? null };
  }, [callbackPath, email]);

  return (
    <AuthCheckEmailCard
      email={email}
      copy={{
        ...CHECK_EMAIL_PROMPT_COPY,
        footerLabel: CHECK_EMAIL_PROMPT_COPY.signInLabel,
      }}
      footerHref={signInHref}
      onResend={onResend}
    />
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
