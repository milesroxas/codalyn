import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TowerBillingScreen } from "@/features/billing/ui/tower-billing-screen";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { isStripeCheckoutConfigured } from "@/server/billing/stripe-billing-routes";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  if (!isTowerBillingEnabled()) {
    redirect("/");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/");
  }

  const h = await headers();
  const activeOrg = await getActiveOrganizationIdForAuthHeaders(h);
  const ent = await resolveTowerEntitlement(userId, activeOrg);
  const usageStatus = await fetchEndUserUsageStatus(userId, activeOrg);
  const [row] = await db
    .select({
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return (
    <TowerBillingScreen
      email={row?.email}
      entitlement={ent}
      usageStatus={usageStatus}
      subscriptionPlan={row?.subscriptionPlan}
      subscriptionStatus={row?.subscriptionStatus}
      checkoutAvailable={isStripeCheckoutConfigured()}
      showPortal={Boolean(row?.stripeCustomerId)}
    />
  );
}
