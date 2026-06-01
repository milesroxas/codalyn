"use client";

import { IconAlertCircle } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  CHECK_EMAIL_PROMPT_COPY,
  EMAIL_VERIFICATION_BANNER_COPY,
  type EmailVerificationPromptContext,
  resolveCheckEmailPromptCopy,
  sendTowerVerificationEmail,
} from "@/features/auth/lib/email-verification";
import { AuthCheckEmailCard } from "@/features/auth/ui/auth-check-email-card";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type CheckEmailPromptProps = {
  email: string;
  callbackPath?: string;
  footerHref?: string;
  context?: EmailVerificationPromptContext;
};

export function CheckEmailPrompt({
  email,
  callbackPath = "/",
  footerHref = "/sign-in",
  context = "signIn",
}: CheckEmailPromptProps) {
  const copy = resolveCheckEmailPromptCopy(context);
  const onResend = useCallback(() => sendTowerVerificationEmail(email, callbackPath), [callbackPath, email]);

  return <AuthCheckEmailCard email={email} copy={copy} footerHref={footerHref} onResend={onResend} />;
}

type EmailVerificationResendButtonProps = {
  email: string;
  callbackPath?: string;
};

export function EmailVerificationResendButton({ email, callbackPath = "/" }: EmailVerificationResendButtonProps) {
  const [pending, setPending] = useState(false);

  const onResend = useCallback(async () => {
    setPending(true);
    const { error } = await sendTowerVerificationEmail(email, callbackPath);
    setPending(false);
    if (error) {
      toast.error(error);
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
  callbackPath?: string;
};

export function EmailVerificationBanner({ email, callbackPath = "/" }: EmailVerificationBannerProps) {
  return (
    <Alert variant="warning">
      <IconAlertCircle />
      <AlertTitle>{EMAIL_VERIFICATION_BANNER_COPY.title}</AlertTitle>
      <AlertDescription>
        {EMAIL_VERIFICATION_BANNER_COPY.description} Your address: {email}.
      </AlertDescription>
      <AlertAction>
        <EmailVerificationResendButton email={email} callbackPath={callbackPath} />
      </AlertAction>
    </Alert>
  );
}
