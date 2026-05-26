import { eq } from "drizzle-orm";
import { resolveOrganizationSeatQuantity } from "@/server/billing/organization-seat-count";
import { ensureStripeCustomerForOrganization } from "@/server/billing/stripe-customer-org";
import { STRIPE_BILLING_SCOPE_ORGANIZATION } from "@/server/billing/stripe-metadata";
import { orgRowHasStripeTeam } from "@/server/billing/stripe-subscription-status";
import { getStripePriceTeamSeat } from "@/server/billing/team-billing-config";
import { requireStripeWorkspaceBillingAdmin } from "@/server/billing/workspace-billing-routes";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

async function readOrganizationId(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { organizationId?: unknown } | null;
    return typeof body?.organizationId === "string" ? body.organizationId.trim() : null;
  }
  const form = await request.formData().catch(() => null);
  const raw = form?.get("organizationId");
  return typeof raw === "string" ? raw.trim() : null;
}

/**
 * Start Stripe Checkout for workspace (team) billing — per-seat subscription on `organization`.
 */
export async function POST(request: Request) {
  const organizationId = await readOrganizationId(request);
  if (!organizationId) {
    return Response.json({ error: "organizationId required" }, { status: 400 });
  }

  const gate = await requireStripeWorkspaceBillingAdmin(request, organizationId);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, userId, organization: org } = gate;

  const price = getStripePriceTeamSeat();
  if (!price) {
    return Response.json(
      {
        error:
          "STRIPE_PRICE_TEAM_SEAT is not set. Add your Stripe per-seat Price id for team billing to the environment.",
      },
      { status: 501 }
    );
  }

  if (
    orgRowHasStripeTeam({
      billingPlan: org.billingPlan,
      subscriptionStatus: org.subscriptionStatus,
      stripeSubscriptionId: org.stripeSubscriptionId,
    })
  ) {
    return Response.json({ error: "This workspace already has an active Team subscription." }, { status: 409 });
  }

  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!u?.email) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const customerId = await ensureStripeCustomerForOrganization(stripe, org, u.email);
  const quantity = await resolveOrganizationSeatQuantity(org.id);
  const base = resolveTowerPublicBaseUrl();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity }],
    success_url: `${base}/team?checkout=success`,
    cancel_url: `${base}/team?checkout=canceled`,
    client_reference_id: org.id,
    metadata: {
      towerOrgId: org.id,
      towerUserId: userId,
      towerBillingScope: STRIPE_BILLING_SCOPE_ORGANIZATION,
    },
    subscription_data: {
      metadata: {
        towerOrgId: org.id,
        towerUserId: userId,
        towerBillingScope: STRIPE_BILLING_SCOPE_ORGANIZATION,
      },
    },
  });

  const url = checkout.url;
  if (!url) {
    return Response.json({ error: "No checkout URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(url, 303);
}
