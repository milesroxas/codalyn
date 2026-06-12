import { eq } from "drizzle-orm";
import { resolveOrganizationSeatQuantity } from "@/server/billing/organization-seat-count";
import { ensureStripeCustomerForOrganization } from "@/server/billing/stripe-customer-org";
import { STRIPE_BILLING_SCOPE_ORGANIZATION } from "@/server/billing/stripe-metadata";
import { orgRowHasStripeTeam } from "@/server/billing/stripe-subscription-status";
import { getStripePriceTeamSeat, getTeamMaxSeats } from "@/server/billing/team-billing-config";
import { parseRequestedSeatQuantity, resolveCheckoutSeatQuantity } from "@/server/billing/team-seat-quantity";
import { requireStripeWorkspaceBillingAdmin } from "@/server/billing/workspace-billing-routes";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

type WorkspaceCheckoutInput = {
  organizationId: string | null;
  /** Admin-selected seat count; null when unspecified or malformed (caller falls back to the seat floor). */
  requestedSeats: number | null;
};

async function readWorkspaceCheckoutInput(request: Request): Promise<WorkspaceCheckoutInput> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { organizationId?: unknown; seats?: unknown } | null;
    return {
      organizationId: typeof body?.organizationId === "string" ? body.organizationId.trim() : null,
      requestedSeats: parseRequestedSeatQuantity(body?.seats),
    };
  }
  const form = await request.formData().catch(() => null);
  const rawOrganizationId = form?.get("organizationId");
  return {
    organizationId: typeof rawOrganizationId === "string" ? rawOrganizationId.trim() : null,
    requestedSeats: parseRequestedSeatQuantity(form?.get("seats") ?? null),
  };
}

/**
 * Start Stripe Checkout for workspace (team) billing — per-seat subscription on `organization`.
 */
export async function POST(request: Request) {
  const { organizationId, requestedSeats } = await readWorkspaceCheckoutInput(request);
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
  const seatFloor = await resolveOrganizationSeatQuantity(org.id);
  const quantity = resolveCheckoutSeatQuantity(seatFloor, requestedSeats, getTeamMaxSeats());
  const base = resolveTowerPublicBaseUrl();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity }],
    success_url: `${base}/team?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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
