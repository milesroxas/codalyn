import { and, eq } from "drizzle-orm";
import { requireStripeBillingSession, type StripeBillingSessionResult } from "@/server/billing/stripe-billing-routes";
import { db } from "@/shared/lib/db";
import { member, organization } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

type WorkspaceBillingFailure = { ok: false; response: Response };
type WorkspaceBillingSuccess = {
  ok: true;
  stripe: NonNullable<Awaited<ReturnType<typeof import("@/server/billing/stripe-client").getStripe>>>;
  userId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionStatus: string | null;
    billingPlan: string | null;
    seatLimit: number | null;
  };
};

export type StripeWorkspaceBillingSessionResult = WorkspaceBillingFailure | WorkspaceBillingSuccess;

/**
 * Shared gate for workspace (team) Stripe routes — billing enabled, signed in, org admin.
 */
export async function requireStripeWorkspaceBillingAdmin(
  request: Request,
  organizationId: string
): Promise<StripeWorkspaceBillingSessionResult> {
  const gate: StripeBillingSessionResult = await requireStripeBillingSession(request);
  if (!gate.ok) {
    return gate;
  }

  const orgId = organizationId.trim();
  if (!orgId) {
    return { ok: false, response: Response.json({ error: "organizationId required" }, { status: 400 }) };
  }

  const [memberRow] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, gate.userId), eq(member.organizationId, orgId)))
    .limit(1);

  if (!memberRow || !isTowerTeamAdminRole(memberRow.role)) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      stripeCustomerId: organization.stripeCustomerId,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      subscriptionStatus: organization.subscriptionStatus,
      billingPlan: organization.billingPlan,
      seatLimit: organization.seatLimit,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org) {
    return { ok: false, response: Response.json({ error: "Workspace not found" }, { status: 404 }) };
  }

  return { ok: true, stripe: gate.stripe, userId: gate.userId, organization: org };
}
