import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TowerUsageSection } from "@/features/billing/ui/tower-usage-section";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { isStripeCheckoutConfigured } from "@/server/billing/stripe-billing-routes";
import { fetchEndUserUsageStatus } from "@/server/billing/usage-status";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

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

  const checkoutAvailable = isStripeCheckoutConfigured();
  const showPortal = Boolean(row?.stripeCustomerId);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tower</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Billing &amp; usage</h1>
        <p className="mt-2 text-muted-foreground">
          Pro unlocks higher monthly limits on Webflow Data API traffic and the AVIF image pipeline (your main Vercel
          cost drivers). Free stays available with caps.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            Signed in as {row?.email}. Source: {ent.source}. Tier: {ent.tier}
            {row?.subscriptionStatus ? ` (${row.subscriptionStatus})` : null}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {checkoutAvailable && ent.tier === "free" ? (
            <form action="/api/billing/checkout" method="post">
              <Button type="submit">Upgrade to Pro</Button>
            </form>
          ) : null}
          {checkoutAvailable && showPortal ? (
            <Button asChild variant="outline">
              <a href="/api/billing/portal">Manage subscription</a>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      <TowerUsageSection
        status={usageStatus}
        title="This month (UTC)"
        description="Usage for your signed-in account against plan limits."
      />

      {!checkoutAvailable ? (
        <p className="text-xs text-muted-foreground">
          Checkout is disabled until you set <code className="font-mono">STRIPE_SECRET_KEY</code> and{" "}
          <code className="font-mono">STRIPE_PRICE_PRO</code> in the environment and run{" "}
          <code className="font-mono">stripe listen</code> for local webhooks.
        </p>
      ) : null}
    </main>
  );
}
