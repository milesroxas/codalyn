import { headers } from "next/headers";
import { TeamDashboard } from "@/features/team/ui/team-dashboard";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { fetchWorkspaceBillingView } from "@/server/billing/workspace-billing-view";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const userId = session?.user?.id;
  const activeOrgId = userId ? await getActiveOrganizationIdForAuthHeaders(h) : null;
  const workspaceBilling = userId && activeOrgId ? await fetchWorkspaceBillingView(userId, activeOrgId) : null;

  return (
    <TeamDashboard
      billingEnabled={isTowerBillingEnabled()}
      workspaceBilling={workspaceBilling}
      activeOrganizationId={activeOrgId}
    />
  );
}
