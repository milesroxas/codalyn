"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buildTowerAuthSurfaceHref } from "@/features/auth/lib/build-tower-auth-surface-href";
import { CheckEmailPrompt } from "@/features/auth/ui/email-verification-prompt";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import {
  buildTeamInvitationAcceptPath,
  classifyTeamInvitationAcceptError,
  TEAM_INVITATION_ACCEPT_COPY,
  type TeamInvitationPreview,
} from "@/shared/lib/membership/team-invitation-accept";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { AcceptInvitationSkeleton } from "@/shared/ui/page-loading-skeletons";

type AcceptInvitationPreview = Extract<TeamInvitationPreview, { ok: true }>;

export function AcceptInvitationLoadingScreen() {
  return (
    <AuthShell>
      <AcceptInvitationSkeleton />
    </AuthShell>
  );
}

export function AcceptInvitationMessageScreen(props: { title: string; description: string; footer: ReactNode }) {
  return (
    <AuthShell>
      <InvitationMessageCard {...props} />
    </AuthShell>
  );
}

export function AcceptInvitationAuthGateScreen(props: { preview: AcceptInvitationPreview; invitationId: string }) {
  const callbackUrl = buildTeamInvitationAcceptPath(props.invitationId);
  const signInHref = buildTowerAuthSurfaceHref("/sign-in", callbackUrl);
  const signUpHref = buildTowerAuthSurfaceHref("/sign-up", callbackUrl);

  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Join {props.preview.organizationName}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {TEAM_INVITATION_ACCEPT_COPY.joinDescription({
              organizationName: props.preview.organizationName,
              inviterName: props.preview.inviterName,
              role: props.preview.role,
              email: props.preview.email,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Button asChild size="form" width="full">
            <Link href={signUpHref}>{TEAM_INVITATION_ACCEPT_COPY.createAccountLabel}</Link>
          </Button>
          <Button asChild variant="outline" size="form" width="full">
            <Link href={signInHref}>{TEAM_INVITATION_ACCEPT_COPY.signInLabel}</Link>
          </Button>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-left text-sm text-muted-foreground">
            Use <span className="font-medium text-foreground">{props.preview.email}</span> when you continue.
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}

export function AcceptInvitationWrongAccountScreen(props: {
  signedInEmail: string;
  invitedEmail: string;
  signingOut: boolean;
  onSignOut: () => void;
}) {
  return (
    <AcceptInvitationMessageScreen
      title={TEAM_INVITATION_ACCEPT_COPY.wrongAccountTitle}
      description={TEAM_INVITATION_ACCEPT_COPY.wrongAccountDescription(props.signedInEmail, props.invitedEmail)}
      footer={
        <Button type="button" variant="outline" size="sm" disabled={props.signingOut} onClick={props.onSignOut}>
          {props.signingOut ? "Signing out…" : TEAM_INVITATION_ACCEPT_COPY.signOutLabel}
        </Button>
      }
    />
  );
}

export function AcceptInvitationVerifyEmailScreen(props: { email: string; invitationId: string }) {
  const callbackUrl = buildTeamInvitationAcceptPath(props.invitationId);
  return (
    <AuthShell>
      <CheckEmailPrompt email={props.email} callbackPath={callbackUrl} footerHref={callbackUrl} context="teamInvite" />
    </AuthShell>
  );
}

export function AcceptInvitationErrorScreen(props: { message: string }) {
  const kind = classifyTeamInvitationAcceptError({ message: props.message });
  return (
    <AcceptInvitationMessageScreen
      title={TEAM_INVITATION_ACCEPT_COPY.unavailableTitle}
      description={props.message}
      footer={
        kind === "already_member" ? (
          <Link href="/team">{TEAM_INVITATION_ACCEPT_COPY.goToTeamLabel}</Link>
        ) : (
          <Link href="/">{TEAM_INVITATION_ACCEPT_COPY.backToHomeLabel}</Link>
        )
      }
    />
  );
}

export function AcceptInvitationWorkingScreen(props: { organizationName: string; accepting: boolean }) {
  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Join {props.organizationName}</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {props.accepting ? TEAM_INVITATION_ACCEPT_COPY.joiningLabel : "Finishing your invitation…"}
          </CardDescription>
        </CardHeader>
      </Card>
    </AuthShell>
  );
}

function InvitationMessageCard(props: { title: string; description: string; footer: ReactNode }) {
  return (
    <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">{props.title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{props.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
        <div className="text-left text-sm text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline">
          {props.footer}
        </div>
      </CardFooter>
    </Card>
  );
}
