import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applyStripeSubscriptionToUser: vi.fn(),
  clearStripeUserSubscription: vi.fn(),
  applyStripeSubscriptionToOrganization: vi.fn(),
  clearStripeOrganizationSubscription: vi.fn(),
  markBillingReadyForTransfer: vi.fn(),
  dbInsert: vi.fn(),
  dbDelete: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/server/billing/stripe-app", () => ({
  applyStripeSubscriptionToUser: mocks.applyStripeSubscriptionToUser,
  clearStripeUserSubscription: mocks.clearStripeUserSubscription,
}));
vi.mock("@/server/billing/stripe-org-app", () => ({
  applyStripeSubscriptionToOrganization: mocks.applyStripeSubscriptionToOrganization,
  clearStripeOrganizationSubscription: mocks.clearStripeOrganizationSubscription,
}));
vi.mock("@/server/membership/workspace-ownership-transfer", () => ({
  workspaceOwnershipTransferService: { markBillingReadyForTransfer: mocks.markBillingReadyForTransfer },
}));
vi.mock("@/shared/lib/db", () => ({
  db: { insert: mocks.dbInsert, delete: mocks.dbDelete, select: mocks.dbSelect },
}));

import { applyStripeWebhookEvent } from "@/server/billing/stripe-webhook-apply";

const ORG_METADATA = { towerBillingScope: "organization", towerOrgId: "org_1", towerUserId: "user_1" };

function mockClaim(rows: Array<{ id: string }>) {
  mocks.dbInsert.mockReturnValue({
    values: () => ({ onConflictDoNothing: () => ({ returning: () => Promise.resolve(rows) }) }),
  });
}

function captureDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  mocks.dbDelete.mockReturnValue({ where });
  return where;
}

function stripeReturning(fresh: Partial<Stripe.Subscription>) {
  const retrieve = vi.fn().mockResolvedValue(fresh);
  return { stripe: { subscriptions: { retrieve } } as unknown as Stripe, retrieve };
}

function subscriptionEvent(type: Stripe.Event["type"], staleId: string): Stripe.Event {
  return { id: "evt_1", type, data: { object: { id: staleId } } } as unknown as Stripe.Event;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClaim([{ id: "evt_1" }]);
  captureDelete();
});

describe("applyStripeWebhookEvent — subscription freshness (H1)", () => {
  it("re-retrieves the authoritative subscription by id before applying", async () => {
    const { stripe, retrieve } = stripeReturning({
      id: "sub_1",
      status: "active",
      customer: "cus_1",
      metadata: ORG_METADATA as unknown as Stripe.Metadata,
      items: { data: [] } as unknown as Stripe.Subscription["items"],
    });

    await applyStripeWebhookEvent(stripe, subscriptionEvent("customer.subscription.updated", "sub_1"));

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(mocks.applyStripeSubscriptionToOrganization).toHaveBeenCalledTimes(1);
    const [appliedSub, orgId] = mocks.applyStripeSubscriptionToOrganization.mock.calls[0];
    expect((appliedSub as Stripe.Subscription).status).toBe("active");
    expect(orgId).toBe("org_1");
  });

  it("clears the subscription when the authoritative state is canceled (ignores stale payload)", async () => {
    const { stripe } = stripeReturning({
      id: "sub_1",
      status: "canceled",
      customer: "cus_1",
      metadata: ORG_METADATA as unknown as Stripe.Metadata,
      items: { data: [] } as unknown as Stripe.Subscription["items"],
    });

    await applyStripeWebhookEvent(stripe, subscriptionEvent("customer.subscription.updated", "sub_1"));

    expect(mocks.clearStripeOrganizationSubscription).toHaveBeenCalledWith("org_1");
    expect(mocks.applyStripeSubscriptionToOrganization).not.toHaveBeenCalled();
  });
});

describe("applyStripeWebhookEvent — idempotency ledger (M1)", () => {
  it("short-circuits a duplicate delivery without running handlers", async () => {
    mockClaim([]);
    const { stripe, retrieve } = stripeReturning({ id: "sub_1", status: "active" });

    await applyStripeWebhookEvent(stripe, subscriptionEvent("customer.subscription.updated", "sub_1"));

    expect(retrieve).not.toHaveBeenCalled();
    expect(mocks.applyStripeSubscriptionToOrganization).not.toHaveBeenCalled();
  });

  it("releases the claim and rethrows when a handler fails so Stripe can retry", async () => {
    const where = captureDelete();
    mocks.applyStripeSubscriptionToOrganization.mockRejectedValueOnce(new Error("boom"));
    const { stripe } = stripeReturning({
      id: "sub_1",
      status: "active",
      customer: "cus_1",
      metadata: ORG_METADATA as unknown as Stripe.Metadata,
      items: { data: [] } as unknown as Stripe.Subscription["items"],
    });

    await expect(
      applyStripeWebhookEvent(stripe, subscriptionEvent("customer.subscription.updated", "sub_1"))
    ).rejects.toThrow("boom");
    expect(where).toHaveBeenCalledTimes(1);
  });
});
