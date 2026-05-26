import { headers } from "next/headers";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { TowerPageSection } from "@/shared/ui/tower-page-shell";

export async function TowerDashboardUsageSection() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const h = await headers();
  const activeOrg = await getActiveOrganizationIdForAuthHeaders(h);
  const status = await fetchEndUserUsageStatus(userId, activeOrg);

  return (
    <TowerPageSection title="Usage">
      <TowerUsageSection
        status={status}
        billingEnabled={isTowerBillingEnabled()}
        showBillingLink
        title="This month"
        description="Monthly allowances for Webflow proxy traffic, CMS writes, and AVIF image processing."
      />
    </TowerPageSection>
  );
}
