"use client";

import { useEffect, useState } from "react";
import {
  fetchOperatorInviteSignUpPrefill,
  type OperatorInviteSignUpPrefill,
} from "@/features/auth/lib/operator-invite-client";
import { fetchTeamInvitationSignUpPrefill } from "@/features/auth/lib/team-invitation-sign-up-prefill";

type AuthInviteSignUpPrefillInput = {
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
  skipPrefill: boolean;
};

type AuthInviteSignUpPrefillState = {
  validated: boolean;
  error: string | null;
  prefill: OperatorInviteSignUpPrefill | null;
  operatorInviteToken: string | null;
  emailLocked: boolean;
};

function resolveAuthInviteSignUpPrefillNeeds(input: AuthInviteSignUpPrefillInput): {
  needsPrefill: boolean;
  operatorInviteNeedsPrefill: boolean;
  teamInviteNeedsPrefill: boolean;
} {
  const operatorInviteNeedsPrefill = Boolean(input.operatorInviteToken && !input.skipPrefill);
  const teamInviteNeedsPrefill = Boolean(input.teamInvitationId && !input.skipPrefill);
  return {
    needsPrefill: operatorInviteNeedsPrefill || teamInviteNeedsPrefill,
    operatorInviteNeedsPrefill,
    teamInviteNeedsPrefill,
  };
}

async function loadAuthInviteSignUpPrefill(input: {
  operatorInviteNeedsPrefill: boolean;
  teamInviteNeedsPrefill: boolean;
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
}): Promise<
  { ok: true; prefill: OperatorInviteSignUpPrefill; operatorInviteToken: string | null } | { ok: false; error: string }
> {
  if (input.operatorInviteNeedsPrefill && input.operatorInviteToken) {
    const result = await fetchOperatorInviteSignUpPrefill(input.operatorInviteToken);
    if (!result.ok) {
      return result;
    }
    return { ok: true, prefill: result.prefill, operatorInviteToken: input.operatorInviteToken };
  }
  if (input.teamInviteNeedsPrefill && input.teamInvitationId) {
    const result = await fetchTeamInvitationSignUpPrefill(input.teamInvitationId);
    if (!result.ok) {
      return result;
    }
    return { ok: true, prefill: result.prefill, operatorInviteToken: null };
  }
  return { ok: false, error: "This invite link is invalid or expired." };
}

export function useAuthInviteSignUpPrefill(input: AuthInviteSignUpPrefillInput): AuthInviteSignUpPrefillState {
  const { needsPrefill, operatorInviteNeedsPrefill, teamInviteNeedsPrefill } =
    resolveAuthInviteSignUpPrefillNeeds(input);
  const [validated, setValidated] = useState(!needsPrefill);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<OperatorInviteSignUpPrefill | null>(null);
  const [operatorInviteToken, setOperatorInviteToken] = useState<string | null>(null);
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    if (!needsPrefill) {
      setValidated(true);
      return;
    }
    let cancelled = false;
    setValidated(false);
    void loadAuthInviteSignUpPrefill({
      operatorInviteNeedsPrefill,
      teamInviteNeedsPrefill,
      operatorInviteToken: input.operatorInviteToken,
      teamInvitationId: input.teamInvitationId,
    }).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setValidated(true);
        return;
      }
      setPrefill(result.prefill);
      setOperatorInviteToken(result.operatorInviteToken);
      setEmailLocked(true);
      setValidated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    needsPrefill,
    operatorInviteNeedsPrefill,
    teamInviteNeedsPrefill,
    input.operatorInviteToken,
    input.teamInvitationId,
  ]);

  return { validated, error, prefill, operatorInviteToken, emailLocked };
}
