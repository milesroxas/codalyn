import { headers } from "next/headers";
import { TeamDashboard } from "@/features/team/ui/team-dashboard";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { syncStripeCheckoutSessionForUser } from "@/server/billing/stripe-checkout-sync";
import { getStripe } from "@/server/billing/stripe-client";
import { fetchWorkspaceBillingView } from "@/server/billing/workspace-billing-view";

export const dynamic = "force-dynamic";

type TeamPageProps = {
  searchParams: Promise<{ checkout?: string | string[]; session_id?: string | string[] }>;
};

function readQueryParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    return readQueryParam(value[0]);
  }
  return null;
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const userId = session?.user?.id;
  const params = await searchParams;
  const checkoutSessionId = readQueryParam(params.session_id);

  if (isTowerBillingEnabled() && readQueryParam(params.checkout) === "success" && checkoutSessionId && userId) {
    const stripe = getStripe();
    if (stripe) {
      await syncStripeCheckoutSessionForUser(stripe, checkoutSessionId, userId);
    }
  }

  const activeOrgId = userId ? await getActiveOrganizationIdForAuthHeaders(h) : null;
  const workspaceBilling = userId && activeOrgId ? await fetchWorkspaceBillingView(userId, activeOrgId) : null;

  return <TeamDashboard workspaceBilling={workspaceBilling} activeOrganizationId={activeOrgId} />;
}
