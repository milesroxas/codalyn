"use client";

import { useEffect, useState } from "react";
import { parseWorkspaceCreationEligibilityPayload } from "@/features/team/lib/workspace-creation-eligibility-response";

type WorkspaceCreationEligibilityState = {
  ready: boolean;
  canCreate: boolean;
  canShowInSwitcher: boolean;
  ownedWorkspaceCount: number;
  hasIndividualPro: boolean;
  viewingTeamWorkspaceWithoutPro: boolean;
};

const failClosed: WorkspaceCreationEligibilityState = {
  ready: true,
  canCreate: false,
  canShowInSwitcher: false,
  ownedWorkspaceCount: 0,
  hasIndividualPro: false,
  viewingTeamWorkspaceWithoutPro: false,
};

async function fetchWorkspaceCreationEligibility(refetchToken: string): Promise<WorkspaceCreationEligibilityState> {
  try {
    const res = await fetch(`/api/account/workspace-creation-eligibility?m=${encodeURIComponent(refetchToken)}`, {
      credentials: "include",
    });
    if (!res.ok) {
      return failClosed;
    }
    const body: unknown = await res.json().catch(() => null);
    const parsed = parseWorkspaceCreationEligibilityPayload(body);
    return {
      ready: true,
      canCreate: parsed?.canCreate ?? false,
      canShowInSwitcher: parsed?.canShowInSwitcher ?? false,
      ownedWorkspaceCount: parsed?.ownedWorkspaceCount ?? 0,
      hasIndividualPro: parsed?.hasIndividualPro ?? false,
      viewingTeamWorkspaceWithoutPro: parsed?.viewingTeamWorkspaceWithoutPro ?? false,
    };
  } catch {
    return failClosed;
  }
}

/**
 * Re-validates workspace creation on the client. Creation UI stays hidden until the server
 * confirms eligibility (fail-closed). Pass `refetchKey` when org membership or active workspace changes.
 */
export function useWorkspaceCreationEligibility(options?: {
  /** SSR/layout hint — used only to show upgrade CTA before the client fetch completes when false. */
  serverCanCreate?: boolean;
  refetchKey?: string | number;
}): {
  canCreateWorkspace: boolean;
  ownedWorkspaceCount: number;
  hasIndividualPro: boolean;
  /** When true, show billing upgrade for users blocked from creating another workspace. */
  showUpgradeForAnotherWorkspace: boolean;
  isReady: boolean;
} {
  const [state, setState] = useState<WorkspaceCreationEligibilityState>({
    ready: false,
    canCreate: false,
    canShowInSwitcher: false,
    ownedWorkspaceCount: 0,
    hasIndividualPro: false,
    viewingTeamWorkspaceWithoutPro: false,
  });
  const refetchKey = options?.refetchKey != null ? String(options.refetchKey) : "";

  useEffect(() => {
    let cancelled = false;
    setState({
      ready: false,
      canCreate: false,
      canShowInSwitcher: false,
      ownedWorkspaceCount: 0,
      hasIndividualPro: false,
      viewingTeamWorkspaceWithoutPro: false,
    });

    void fetchWorkspaceCreationEligibility(refetchKey).then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refetchKey]);

  const serverCanCreate = options?.serverCanCreate ?? false;
  const ownedWorkspaceCount = state.ready ? state.ownedWorkspaceCount : 0;
  const hasIndividualPro = state.ready ? state.hasIndividualPro : false;
  const canCreateWorkspace = state.ready ? state.canShowInSwitcher : false;
  const needsProForAnother = state.ready && !state.canCreate && ownedWorkspaceCount >= 1 && !hasIndividualPro;

  return {
    canCreateWorkspace,
    ownedWorkspaceCount,
    hasIndividualPro,
    showUpgradeForAnotherWorkspace: state.ready ? needsProForAnother : !serverCanCreate,
    isReady: state.ready,
  };
}
