"use client";

import { useCallback } from "react";
import {
  PASSWORD_RESET_CHECK_EMAIL_COPY,
  resolveTowerPasswordResetRedirectUrl,
} from "@/features/auth/lib/password-reset";
import { authClient } from "@/features/auth/model/auth-client";
import { AuthCheckEmailCard } from "@/features/auth/ui/auth-check-email-card";

type PasswordResetCheckEmailPromptProps = {
  email: string;
  callbackPath?: string;
  signInHref?: string;
};

export function PasswordResetCheckEmailPrompt({
  email,
  callbackPath = "/",
  signInHref = "/sign-in",
}: PasswordResetCheckEmailPromptProps) {
  const onResend = useCallback(async () => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: resolveTowerPasswordResetRedirectUrl(callbackPath),
      fetchOptions: { credentials: "include" },
    });
    return { error: error?.message ?? null };
  }, [callbackPath, email]);

  return (
    <AuthCheckEmailCard
      email={email}
      copy={PASSWORD_RESET_CHECK_EMAIL_COPY}
      footerHref={signInHref}
      onResend={onResend}
    />
  );
}
