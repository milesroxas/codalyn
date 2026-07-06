import { TOWER_PLAN_CATALOG, type TowerIndividualPlanKey } from "@codalyn/webflow-kit";

/**
 * Customer-facing copy for the individual (user-scoped) plans on the /billing page.
 *
 * `bestFor` is the one-line scan target on each plan row; `details` are the expandable bullets.
 * Workspace counts derive from the shared plan catalog so copy cannot drift from the contract.
 * Usage-cap numbers are intentionally qualitative here — actual limits are operator-overridable at
 * runtime and shown in the usage limits table on the same page.
 */
export type IndividualPlanCopy = {
  bestFor: string;
  details: string[];
};

function ownedWorkspacesLine(plan: TowerIndividualPlanKey): string {
  const allowance = TOWER_PLAN_CATALOG[plan].ownedWorkspaceAllowance;
  return allowance === 1 ? "1 workspace you own" : `Up to ${allowance} workspaces you own`;
}

export const INDIVIDUAL_PLAN_COPY: Record<TowerIndividualPlanKey, IndividualPlanCopy> = {
  free: {
    bestFor: "Best for trying Codalyn on a single site.",
    details: [
      ownedWorkspacesLine("free"),
      "Starter monthly limits for Webflow updates, layout saves, and image credits",
      "Join any Team workspace you're invited to",
    ],
  },
  pro: {
    bestFor: "Best for freelancers running a few client sites solo.",
    details: [
      ownedWorkspacesLine("pro"),
      "Higher monthly limits for Webflow updates, layout saves, and image credits",
      "Your plan follows you across the workspaces you own",
    ],
  },
  studio: {
    bestFor: "Best for studios managing many client sites.",
    details: [
      ownedWorkspacesLine("studio"),
      "Highest individual monthly limits for Webflow updates, layout saves, and image credits",
      "Your plan follows you across the workspaces you own",
    ],
  },
};
