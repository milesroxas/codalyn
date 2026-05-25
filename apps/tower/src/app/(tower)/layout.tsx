import { headers } from "next/headers";
import type * as React from "react";
import { TowerUsageApproachingBanner } from "@/features/billing/ui/tower-usage-approaching-banner";
import { TowerHeader } from "@/features/tower-ui/tower-header";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";

export default async function TowerLayout({ children }: { children: React.ReactNode }) {
  const billingEnabled = isTowerBillingEnabled();
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const h = await headers();
  const activeOrg = userId ? await getActiveOrganizationIdForAuthHeaders(h) : null;

  return (
    <>
      <TowerHeader billingEnabled={billingEnabled} />
      {userId ? (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
          <TowerUsageApproachingBanner
            userId={userId}
            activeOrganizationId={activeOrg}
            billingEnabled={billingEnabled}
          />
        </div>
      ) : null}
      {children}
    </>
  );
}
