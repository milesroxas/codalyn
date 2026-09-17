"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useId, useState } from "react";
import { resolveSignUpCardDescription, shouldShowEarlyAccessSignUpGate } from "@/features/auth/lib/auth-surface-copy";
import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";
import { resolveTowerEmailVerificationAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { messageForRedeemFailure, redeemOperatorInviteClient } from "@/features/auth/lib/operator-invite-client";
import { resolveUserAndTokenAfterEmailAuth } from "@/features/auth/lib/resolve-email-auth-session";
import { resolvePostAuthRedirectTarget } from "@/features/auth/lib/resolve-post-auth-redirect";
import { submitTowerEmailSignUp } from "@/features/auth/lib/submit-tower-email-sign-up";
import { completeTowerWebPostAuthNavigation } from "@/features/auth/model/tower-post-auth-navigation";
import { useAuthInviteSignUpPrefill } from "@/features/auth/model/use-auth-invite-sign-up-prefill";
import { useRedirectAuthenticatedFromAuthSurface } from "@/features/auth/model/use-redirect-authenticated-from-auth-surface";
import { EarlyAccessSignUpGate } from "@/features/auth/ui/early-access-sign-up-gate";
import { CheckEmailPrompt } from "@/features/auth/ui/email-verification-prompt";
import { SignUpAccountCard } from "@/features/auth/ui/sign-up-account-card";
import { AuthCardSkeleton } from "@/features/tower-ui/auth-card-skeleton";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import { resolveTowerEarlyAccessRequired } from "@/shared/lib/access/access-policy";
import { isTeamInvitationAcceptPath } from "@/shared/lib/membership/team-invitation-accept";
import {
  readTeamInvitationIdFromCallbackPath,
  readTeamInviteAcceptTokenFromCallbackPath,
} from "@/shared/lib/membership/team-invitation-header";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";

async function runAfterTowerSignUp(opts: { operatorInviteToken: string | null }): Promise<string | null> {
  if (opts.operatorInviteToken) {
    const redeemResult = await redeemOperatorInviteClient(opts.operatorInviteToken);
    if (redeemResult !== "ok") {
      return messageForRedeemFailure(redeemResult);
    }
  }
  return null;
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeRelativePath(searchParams.get("callbackUrl") ?? "/");
  const operatorInviteParam = searchParams.get("invite");
  const { sessionPending, redirecting: redirectingSignedInUser } = useRedirectAuthenticatedFromAuthSurface({
    callbackUrl,
  });
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [earlyAccessRequired, setEarlyAccessRequired] = useState<boolean | null>(null);
  const joiningViaTeamInvite = isTeamInvitationAcceptPath(callbackUrl);
  const teamInvitationId = readTeamInvitationIdFromCallbackPath(callbackUrl);
  const teamInviteAcceptToken = readTeamInviteAcceptTokenFromCallbackPath(callbackUrl);
  const invitePrefill = useAuthInviteSignUpPrefill({
    operatorInviteToken: operatorInviteParam,
    teamInvitationId,
  });
  const operatorInviteToken = invitePrefill.operatorInviteToken ?? operatorInviteParam?.trim() ?? null;
  const inviteEmailLocked = invitePrefill.emailLocked;
  const [awaitingVerificationEmail, setAwaitingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/access-policy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!cancelled) {
          setEarlyAccessRequired(resolveTowerEarlyAccessRequired(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEarlyAccessRequired(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!invitePrefill.prefill) {
      return;
    }
    setEmail(invitePrefill.prefill.email);
    if (invitePrefill.prefill.firstName) {
      setFirstName(invitePrefill.prefill.firstName);
    }
    if (invitePrefill.prefill.lastName) {
      setLastName(invitePrefill.prefill.lastName);
    }
  }, [invitePrefill.prefill]);

  async function finishSignUp(data: Parameters<typeof resolveUserAndTokenAfterEmailAuth>[0]) {
    const { user: u } = await resolveUserAndTokenAfterEmailAuth(data);
    completeTowerWebPostAuthNavigation(resolvePostAuthRedirectTarget(u, callbackUrl));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const displayName =
      [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || email.split("@")[0] || "User";
    const inviteToken = operatorInviteToken ?? operatorInviteParam?.trim() ?? null;
    const verificationCallback = resolveTowerEmailVerificationAppCallbackUrl(callbackUrl);
    const result = await submitTowerEmailSignUp({
      email,
      password,
      displayName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      verificationCallback,
      operatorInviteToken: inviteToken,
      teamInvitationId,
      teamInviteAcceptToken,
      joiningViaTeamInvite,
    });
    setPending(false);
    if (result.kind === "error") {
      setError(result.message);
      return;
    }
    if (result.kind === "awaiting_verification") {
      setAwaitingVerificationEmail(result.email);
      return;
    }
    const postErr = await runAfterTowerSignUp({ operatorInviteToken: inviteToken });
    if (postErr) {
      setError(postErr);
      return;
    }
    await finishSignUp(result.data);
  }

  const authSearchParams = {
    invite: operatorInviteParam,
  };
  const signInHref = buildTowerAuthSurfaceHref("/sign-in", callbackUrl, authSearchParams);
  const signUpHref = buildTowerAuthSurfaceHref("/sign-up", callbackUrl, authSearchParams);
  const requestAccessHref = buildTowerAuthSurfaceHref("/request-access", callbackUrl, authSearchParams);
  const verificationPromptContext = joiningViaTeamInvite ? "teamInvite" : "signUp";

  const authBusy =
    sessionPending || redirectingSignedInUser || earlyAccessRequired === null || !invitePrefill.validated;
  const showAuthSkeleton = useDeferredLoadingIndicator(authBusy);
  if (showAuthSkeleton) {
    return <AuthCardSkeleton variant="sign-up" />;
  }
  if (authBusy) {
    return null;
  }

  if (
    shouldShowEarlyAccessSignUpGate({
      earlyAccessRequired,
      operatorInviteToken,
      operatorInviteParam,
      joiningViaTeamInvite,
    })
  ) {
    return <EarlyAccessSignUpGate signInHref={signInHref} requestAccessHref={requestAccessHref} />;
  }

  if (awaitingVerificationEmail) {
    return (
      <AuthShell>
        <CheckEmailPrompt
          email={awaitingVerificationEmail}
          callbackPath={callbackUrl}
          footerHref={joiningViaTeamInvite ? callbackUrl : signUpHref}
          context={verificationPromptContext}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <SignUpAccountCard
        cardDescription={resolveSignUpCardDescription(joiningViaTeamInvite)}
        firstNameId={firstNameId}
        lastNameId={lastNameId}
        emailId={emailId}
        passwordId={passwordId}
        firstName={firstName}
        lastName={lastName}
        email={email}
        password={password}
        inviteEmailLocked={inviteEmailLocked}
        errorMessage={error ?? invitePrefill.error}
        pending={pending}
        signInHref={signInHref}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
      />
    </AuthShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <AuthCardSkeleton variant="sign-up" />
        </TowerDeferredLoadingFallback>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
