import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/server/auth";
import {
  countUserActiveWorkspaceMemberships,
  resolveUserWorkspaceCreationEligibility,
} from "@/server/membership/user-workspace-creation-eligibility";
import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { resolveWebflowBearerToken } from "@/server/webflow-proxy-token";

/** Shared per-request session + workspace onboarding fields (layout banner, full summary). */
export type TowerSessionOnboardingContext = {
  signedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  activeOrganizationId: string | null;
  workspaceMembershipCount: number;
  canCreateOrganization: boolean;
  activeOrgTeamAdmin: boolean;
  webflowOAuthConnected: boolean;
  /** Resolved bearer for this request; server-only, not passed to client components. */
  webflowAccessToken: string | null;
};

const signedOutContext: TowerSessionOnboardingContext = {
  signedIn: false,
  userId: null,
  userEmail: null,
  activeOrganizationId: null,
  workspaceMembershipCount: 0,
  canCreateOrganization: false,
  activeOrgTeamAdmin: false,
  webflowOAuthConnected: false,
  webflowAccessToken: null,
};

export const getTowerSessionOnboardingContext = cache(async (): Promise<TowerSessionOnboardingContext> => {
  const requestHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: requestHeaders });
  const userId = sessionData?.user?.id;
  const userEmail = typeof sessionData?.user?.email === "string" ? sessionData.user.email : null;

  if (!userId) {
    return signedOutContext;
  }

  const rawSession = sessionData.session as { id?: string } | undefined;
  const activeOrganizationId = await resolveActiveOrganizationId(userId, rawSession?.id);

  const [workspaceMembershipCount, activeOrgTeamAdmin, webflowAccessToken, workspaceCreationEligibility] =
    await Promise.all([
      countUserActiveWorkspaceMemberships(userId),
      activeOrganizationId ? isTowerTeamAdminMemberOfOrg(userId, activeOrganizationId) : Promise.resolve(false),
      resolveWebflowBearerToken({ userId, requestHeaders }),
      resolveUserWorkspaceCreationEligibility(userId),
    ]);

  return {
    signedIn: true,
    userId,
    userEmail,
    activeOrganizationId,
    workspaceMembershipCount,
    canCreateOrganization: workspaceCreationEligibility.canCreate,
    activeOrgTeamAdmin: activeOrgTeamAdmin,
    webflowOAuthConnected: Boolean(webflowAccessToken),
    webflowAccessToken: webflowAccessToken ?? null,
  };
});
