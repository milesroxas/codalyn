import { cache } from "react";
import {
  getTowerSessionOnboardingContext,
  type TowerSessionOnboardingContext,
} from "@/server/tower-onboarding-context";

/** Fields required by the global workspace / Webflow onboarding banner. */
export type TowerOnboardingBannerSummary = Pick<
  TowerSessionOnboardingContext,
  | "signedIn"
  | "workspaceMembershipCount"
  | "activeOrganizationId"
  | "canCreateOrganization"
  | "webflowOAuthConnected"
  | "activeOrgTeamAdmin"
>;

export const getTowerOnboardingBannerSummary = cache(async (): Promise<TowerOnboardingBannerSummary> => {
  const ctx = await getTowerSessionOnboardingContext();
  return {
    signedIn: ctx.signedIn,
    workspaceMembershipCount: ctx.workspaceMembershipCount,
    activeOrganizationId: ctx.activeOrganizationId,
    canCreateOrganization: ctx.canCreateOrganization,
    webflowOAuthConnected: ctx.webflowOAuthConnected,
    activeOrgTeamAdmin: ctx.activeOrgTeamAdmin,
  };
});
