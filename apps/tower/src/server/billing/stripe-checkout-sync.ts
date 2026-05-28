import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import {
  readStripeBillingScopeFromMetadata,
  readTowerOrgIdFromStripeMetadata,
  readTowerUserIdFromStripeMetadata,
  STRIPE_BILLING_SCOPE_ORGANIZATION,
} from "@/server/billing/stripe-metadata";
import { applyStripeCheckoutSessionCompleted } from "@/server/billing/stripe-webhook-apply";
import { db } from "@/shared/lib/db";
import { member } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

async function isActorAuthorizedForCheckoutSession(
  actorUserId: string,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const scope = readStripeBillingScopeFromMetadata(session.metadata);
  const towerOrgId =
    readTowerOrgIdFromStripeMetadata(session.metadata) ??
    (scope === STRIPE_BILLING_SCOPE_ORGANIZATION && typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);

  if (towerOrgId) {
    const [memberRow] = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, actorUserId), eq(member.organizationId, towerOrgId)))
      .limit(1);
    return Boolean(memberRow && isTowerTeamAdminRole(memberRow.role));
  }

  const towerUserId =
    (typeof session.client_reference_id === "string" && session.client_reference_id.length > 0
      ? session.client_reference_id
      : null) ?? readTowerUserIdFromStripeMetadata(session.metadata);
  return towerUserId === actorUserId;
}

/**
 * Idempotent fallback when Stripe webhooks are delayed or not forwarded (e.g. local dev).
 * Applies the same persistence as `checkout.session.completed` after the user returns from Checkout.
 */
export async function syncStripeCheckoutSessionForUser(
  stripe: Stripe,
  checkoutSessionId: string,
  actorUserId: string
): Promise<boolean> {
  const sessionId = checkoutSessionId.trim();
  if (!sessionId) {
    return false;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return false;
  }

  if (session.status !== "complete" || session.mode !== "subscription") {
    return false;
  }

  if (!(await isActorAuthorizedForCheckoutSession(actorUserId, session))) {
    return false;
  }

  await applyStripeCheckoutSessionCompleted(stripe, session);
  return true;
}
