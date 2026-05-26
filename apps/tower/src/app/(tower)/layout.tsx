import { headers } from "next/headers";
import type * as React from "react";
import { TowerUsageApproachingBanner } from "@/features/billing/ui/tower-usage-approaching-banner";
import { TowerAppShell } from "@/features/tower-ui/tower-app-shell";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";

export default async function TowerLayout({ children }: { children: React.ReactNode }) {
  const billingEnabled = isTowerBillingEnabled();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const h = await headers();
  const activeOrg = userId ? await getActiveOrganizationIdForAuthHeaders(h) : null;

  const usageBanner = userId ? (
    <TowerUsageApproachingBanner userId={userId} activeOrganizationId={activeOrg} billingEnabled={billingEnabled} />
  ) : null;

  return (
    <TowerAppShell billingEnabled={billingEnabled} signedIn={Boolean(userId)} usageBanner={usageBanner}>
      {children}
    </TowerAppShell>
  );
}
