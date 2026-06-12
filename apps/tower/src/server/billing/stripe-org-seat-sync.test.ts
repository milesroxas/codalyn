import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTowerBillingEnabled: vi.fn(),
  getStripe: vi.fn(),
  getStripePriceTeamSeat: vi.fn(),
  resolveOrganizationSeatQuantity: vi.fn(),
  shouldSkipStripeSeatQuantitySync: vi.fn(),
  readSubscriptionSeatQuantity: vi.fn(),
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
}));

vi.mock("@/server/billing/billing-feature", () => ({ isTowerBillingEnabled: mocks.isTowerBillingEnabled }));
vi.mock("@/server/billing/stripe-client", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/server/billing/team-billing-config", () => ({ getStripePriceTeamSeat: mocks.getStripePriceTeamSeat }));
vi.mock("@/server/billing/organization-seat-count", () => ({
  resolveOrganizationSeatQuantity: mocks.resolveOrganizationSeatQuantity,
}));
vi.mock("@/server/billing/organization-seat-override", () => ({
  shouldSkipStripeSeatQuantitySync: mocks.shouldSkipStripeSeatQuantitySync,
}));
vi.mock("@/server/billing/stripe-org-app", () => ({
  readSubscriptionSeatQuantity: mocks.readSubscriptionSeatQuantity,
}));
vi.mock("@/shared/lib/db", () => ({ db: { select: mocks.dbSelect, update: mocks.dbUpdate } }));

import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";

const TEAM_PRICE = "price_team";

function mockOrgRow(row: Record<string, unknown> | undefined) {
  mocks.dbSelect.mockReturnValue({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(row ? [row] : []) }) }),
  });
}

function stripeWithSubscription(sub: unknown) {
  const retrieve = vi.fn().mockResolvedValue(sub);
  const update = vi.fn().mockResolvedValue(undefined);
  mocks.getStripe.mockReturnValue({ subscriptions: { retrieve, update } });
  return { retrieve, update };
}

function captureUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mocks.dbUpdate.mockReturnValue({ set });
  return { set, where };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTowerBillingEnabled.mockReturnValue(true);
  mocks.getStripePriceTeamSeat.mockReturnValue(TEAM_PRICE);
  mocks.shouldSkipStripeSeatQuantitySync.mockReturnValue(false);
});

describe("syncOrganizationSeatQuantityWithStripe", () => {
  it("skips Stripe entirely when the seat floor fits within purchased seats (grow-only no-op)", async () => {
    mockOrgRow({
      id: "org_1",
      stripeSubscriptionId: "sub_1",
      operatorSeatLimitOverride: false,
      stripeSeatQuantity: 10,
    });
    mocks.resolveOrganizationSeatQuantity.mockResolvedValue(6);
    const stripe = stripeWithSubscription(null);
    const update = captureUpdate();

    await syncOrganizationSeatQuantityWithStripe("org_1");

    expect(stripe.retrieve).not.toHaveBeenCalled();
    expect(stripe.update).not.toHaveBeenCalled();
    expect(update.set).not.toHaveBeenCalled();
  });

  it("grows the subscription when members exceed purchased seats", async () => {
    mockOrgRow({ id: "org_1", stripeSubscriptionId: "sub_1", operatorSeatLimitOverride: false, stripeSeatQuantity: 6 });
    mocks.resolveOrganizationSeatQuantity.mockResolvedValue(8);
    mocks.readSubscriptionSeatQuantity.mockReturnValue(6);
    const stripe = stripeWithSubscription({
      items: { data: [{ id: "si_1", price: { id: TEAM_PRICE }, quantity: 6 }] },
    });
    const update = captureUpdate();

    await syncOrganizationSeatQuantityWithStripe("org_1");

    expect(stripe.update).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_1", quantity: 8 }],
      proration_behavior: "create_prorations",
    });
    expect(update.set).toHaveBeenCalledWith({ seatLimit: 8, stripeSeatQuantity: 8 });
  });

  it("bumps a below-minimum purchased quantity up to the seat floor", async () => {
    mockOrgRow({ id: "org_1", stripeSubscriptionId: "sub_1", operatorSeatLimitOverride: false, stripeSeatQuantity: 3 });
    mocks.resolveOrganizationSeatQuantity.mockResolvedValue(6);
    mocks.readSubscriptionSeatQuantity.mockReturnValue(3);
    const stripe = stripeWithSubscription({
      items: { data: [{ id: "si_1", price: { id: TEAM_PRICE }, quantity: 3 }] },
    });
    captureUpdate();

    await syncOrganizationSeatQuantityWithStripe("org_1");

    expect(stripe.update).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_1", quantity: 6 }],
      proration_behavior: "create_prorations",
    });
  });

  it("is a no-op when the workspace has no team subscription", async () => {
    mockOrgRow({ id: "org_1", stripeSubscriptionId: null, operatorSeatLimitOverride: false, stripeSeatQuantity: null });
    const stripe = stripeWithSubscription(null);

    await syncOrganizationSeatQuantityWithStripe("org_1");

    expect(stripe.retrieve).not.toHaveBeenCalled();
  });
});
