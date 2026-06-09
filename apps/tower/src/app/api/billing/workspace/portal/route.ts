import { getStripeWorkspacePortalConfigurationId } from "@/server/billing/stripe-config";
import { requireStripeWorkspaceBillingAdmin } from "@/server/billing/workspace-billing-routes";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";

export const runtime = "nodejs";

/**
 * Redirect workspace admins to Stripe Customer Portal for the organization's billing account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() ?? "";
  if (!organizationId) {
    return Response.json({ error: "organizationId required" }, { status: 400 });
  }

  const gate = await requireStripeWorkspaceBillingAdmin(request, organizationId);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, organization: org } = gate;

  if (!org.stripeCustomerId) {
    return Response.json({ error: "No billing account yet. Subscribe to Team first." }, { status: 400 });
  }

  const base = resolveTowerPublicBaseUrl();
  const portalConfigurationId = getStripeWorkspacePortalConfigurationId();
  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/team`,
    ...(portalConfigurationId ? { configuration: portalConfigurationId } : {}),
  });
  if (!portal.url) {
    return Response.json({ error: "No portal URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(portal.url, 303);
}
