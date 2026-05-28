import { headers } from "next/headers";
import type * as React from "react";
import { TowerEmailVerificationBanner } from "@/features/auth/ui/tower-email-verification-banner";
import { TowerUsageApproachingBanner } from "@/features/billing/ui/tower-usage-approaching-banner";
import { TowerAppShell } from "@/features/tower-ui/tower-app-shell";
import { TowerWorkspaceOnboardingShell } from "@/features/tower-ui/tower-workspace-onboarding-shell";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { getTowerSessionOnboardingContext } from "@/server/tower-onboarding-context";

export const dynamic = "force-dynamic";

export default async function TowerLayout({ children }: { children: React.ReactNode }) {
  const billingEnabled = isTowerBillingEnabled();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id;
  const activeOrg = userId ? await getActiveOrganizationIdForAuthHeaders(requestHeaders) : null;
  const onboardingCtx = userId ? await getTowerSessionOnboardingContext() : null;

  const usageBanner = userId ? (
    <TowerUsageApproachingBanner userId={userId} activeOrganizationId={activeOrg} billingEnabled={billingEnabled} />
  ) : null;
  const emailVerificationBanner =
    userId && session?.user && !session.user.emailVerified ? <TowerEmailVerificationBanner /> : null;
  const workspaceOnboarding = userId ? <TowerWorkspaceOnboardingShell /> : null;

  return (
    <TowerAppShell
      billingEnabled={billingEnabled}
      signedIn={Boolean(userId)}
      canCreateWorkspace={onboardingCtx?.canCreateOrganization ?? false}
      usageBanner={usageBanner}
      emailVerificationBanner={emailVerificationBanner}
      workspaceOnboarding={workspaceOnboarding}
    >
      {children}
    </TowerAppShell>
  );
}
