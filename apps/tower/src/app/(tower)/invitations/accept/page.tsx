"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import {
  AcceptInvitationAuthGateScreen,
  AcceptInvitationErrorScreen,
  AcceptInvitationLoadingScreen,
  AcceptInvitationMessageScreen,
  AcceptInvitationWorkingScreen,
  AcceptInvitationWrongAccountScreen,
} from "@/features/team/ui/accept-invitation-screen";
import {
  classifyTeamInvitationAcceptError,
  messageForTeamInvitationAcceptError,
  readTeamInvitationIdFromSearchParams,
  TEAM_INVITATION_ACCEPT_COPY,
  type TeamInvitationPreview,
} from "@/shared/lib/membership/team-invitation-accept";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";

type PreviewState = { status: "loading" } | { status: "error" } | { status: "ready"; preview: TeamInvitationPreview };

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = readTeamInvitationIdFromSearchParams(searchParams);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const showInvitationSkeleton = useDeferredLoadingIndicator(sessionPending);
  const attemptedAcceptRef = useRef(false);

  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!invitationId) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/team/invitations/preview?invitationId=${encodeURIComponent(invitationId)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => (res.ok ? ((await res.json()) as TeamInvitationPreview) : null))
      .then((preview) => {
        if (cancelled) {
          return;
        }
        setPreviewState(preview ? { status: "ready", preview } : { status: "error" });
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewState({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const acceptInvitation = useCallback(async () => {
    if (!invitationId) {
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    const result = await authClient.organization.acceptInvitation({ invitationId });
    setAccepting(false);
    if (result.error) {
      const kind = classifyTeamInvitationAcceptError(result.error);
      const msg = messageForTeamInvitationAcceptError(kind, result.error.message);
      setAcceptError(msg);
      toast.error(msg);
      attemptedAcceptRef.current = false;
      return;
    }
    toast.success(TEAM_INVITATION_ACCEPT_COPY.successToast);
    router.push("/team");
    router.refresh();
  }, [invitationId, router]);

  useEffect(() => {
    if (!invitationId || sessionPending || attemptedAcceptRef.current || !session?.user) {
      return;
    }
    if (previewState.status !== "ready" || !previewState.preview.ok) {
      return;
    }
    const invitedEmail = previewState.preview.email.trim().toLowerCase();
    const signedInEmail = session.user.email.trim().toLowerCase();
    if (invitedEmail !== signedInEmail) {
      return;
    }
    attemptedAcceptRef.current = true;
    void acceptInvitation();
  }, [acceptInvitation, invitationId, previewState, session?.user, sessionPending]);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await authClient.signOut({ fetchOptions: { credentials: "include" } });
      attemptedAcceptRef.current = false;
      setAcceptError(null);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  if (!invitationId) {
    return (
      <AcceptInvitationMessageScreen
        title={TEAM_INVITATION_ACCEPT_COPY.unavailableTitle}
        description={TEAM_INVITATION_ACCEPT_COPY.missingInvitation}
        footer={<Link href="/">Back to home</Link>}
      />
    );
  }

  if (showInvitationSkeleton || previewState.status === "loading" || sessionPending) {
    return <AcceptInvitationLoadingScreen />;
  }

  if (previewState.status === "error") {
    return (
      <AcceptInvitationMessageScreen
        title={TEAM_INVITATION_ACCEPT_COPY.unavailableTitle}
        description={TEAM_INVITATION_ACCEPT_COPY.previewLoadingError}
        footer={<Link href="/">Back to home</Link>}
      />
    );
  }

  const preview = previewState.preview;
  if (!preview.ok) {
    const expired = preview.reason === "expired";
    return (
      <AcceptInvitationMessageScreen
        title={expired ? TEAM_INVITATION_ACCEPT_COPY.expiredTitle : TEAM_INVITATION_ACCEPT_COPY.unavailableTitle}
        description={
          expired ? TEAM_INVITATION_ACCEPT_COPY.expiredDescription : TEAM_INVITATION_ACCEPT_COPY.unavailableDescription
        }
        footer={<Link href="/">Back to home</Link>}
      />
    );
  }

  if (!session?.user) {
    return <AcceptInvitationAuthGateScreen preview={preview} invitationId={invitationId} />;
  }

  const signedInEmail = session.user.email.trim().toLowerCase();
  const invitedEmail = preview.email.trim().toLowerCase();
  if (signedInEmail !== invitedEmail) {
    return (
      <AcceptInvitationWrongAccountScreen
        signedInEmail={session.user.email}
        invitedEmail={preview.email}
        signingOut={signingOut}
        onSignOut={() => void onSignOut()}
      />
    );
  }

  if (acceptError) {
    return <AcceptInvitationErrorScreen message={acceptError} />;
  }

  return <AcceptInvitationWorkingScreen organizationName={preview.organizationName} accepting={accepting} />;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <AcceptInvitationLoadingScreen />
        </TowerDeferredLoadingFallback>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
