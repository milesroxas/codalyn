import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TowerBillingScreen } from "@/features/billing/ui/tower-billing-screen";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { isStripeCheckoutConfigured, isStudioCheckoutConfigured } from "@/server/billing/stripe-billing-routes";
import { syncStripeCheckoutSessionForUser } from "@/server/billing/stripe-checkout-sync";
import { getStripe } from "@/server/billing/stripe-client";
import { resolveUserIndividualPlan } from "@/server/billing/stripe-individual-pro";
import { fetchSubscriptionCancelAt } from "@/server/billing/stripe-subscription-cancellation";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { fetchWorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import {
  fetchWorkspaceUsageContributors,
  type WorkspaceUsageContributor,
} from "@/server/billing/workspace-usage-contributors";
import { db } from "@/shared/lib/db";
import { organization, user } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

type BillingPageProps = {
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

async function resolveIndividualCancelAt(subscriptionId: string | null | undefined): Promise<Date | null> {
  if (!subscriptionId) {
    return null;
  }
  const stripe = getStripe();
  return stripe ? fetchSubscriptionCancelAt(stripe, subscriptionId) : null;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  if (!isTowerBillingEnabled()) {
    redirect("/");
  }
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  const params = await searchParams;
  const checkoutSessionId = readQueryParam(params.session_id);
  if (readQueryParam(params.checkout) === "success" && checkoutSessionId) {
    const stripe = getStripe();
    if (stripe) {
      await syncStripeCheckoutSessionForUser(stripe, checkoutSessionId, userId);
    }
  }
  const activeOrg = await getActiveOrganizationIdForAuthHeaders(h);
  const ent = await resolveTowerEntitlement(userId, activeOrg);
  const usageStatus = await fetchEndUserUsageStatus(userId, activeOrg);
  const [row] = await db
    .select({
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const individualPlan = row ? await resolveUserIndividualPlan(row) : null;
  const hasIndividualPro = individualPlan !== null;

  const individualCancelAt = hasIndividualPro ? await resolveIndividualCancelAt(row?.stripeSubscriptionId) : null;

  const [activeOrganizationName, workspaceBilling] = activeOrg
    ? await Promise.all([
        db
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, activeOrg))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null),
        fetchWorkspaceBillingView(userId, activeOrg),
      ])
    : [null, null];

  // Per-member pool attribution is sensitive, so only surface it to Team-pool admins who manage billing.
  const usageContributors: WorkspaceUsageContributor[] | null =
    activeOrg && usageStatus.usageScope === "workspace" && workspaceBilling?.canManageBilling
      ? await fetchWorkspaceUsageContributors(activeOrg)
      : null;

  return (
    <TowerBillingScreen
      email={row?.email}
      individualPlan={individualPlan}
      entitlement={ent}
      usageStatus={usageStatus}
      individualSubscriptionStatus={hasIndividualPro ? row?.subscriptionStatus : null}
      individualCancelAt={individualCancelAt}
      checkoutAvailable={isStripeCheckoutConfigured()}
      studioCheckoutAvailable={isStudioCheckoutConfigured()}
      showIndividualPortal={hasIndividualPro && Boolean(row?.stripeCustomerId)}
      activeOrganizationId={activeOrg}
      activeOrganizationName={activeOrganizationName}
      workspaceBilling={workspaceBilling}
      usageContributors={usageContributors}
    />
  );
}
