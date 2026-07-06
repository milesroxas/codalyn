import { describe, expect, it } from "vitest";
import { buildStripePortalFlowData, parseStripePortalFlowParams } from "@/server/billing/stripe-portal-flows";

describe("parseStripePortalFlowParams", () => {
  it("returns null when no flow is requested", () => {
    expect(parseStripePortalFlowParams(new URLSearchParams())).toBeNull();
  });

  it("parses the cancel flow", () => {
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=cancel"))).toEqual({ kind: "cancel" });
  });

  it("parses switch flows for both paid plans", () => {
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=switch&plan=pro"))).toEqual({
      kind: "switch",
      plan: "pro",
    });
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=switch&plan=studio"))).toEqual({
      kind: "switch",
      plan: "studio",
    });
  });

  it("rejects a switch without a valid target plan", () => {
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=switch"))).toBe("invalid");
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=switch&plan=team"))).toBe("invalid");
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=switch&plan="))).toBe("invalid");
  });

  it("rejects unknown flows", () => {
    expect(parseStripePortalFlowParams(new URLSearchParams("flow=upgrade"))).toBe("invalid");
    expect(parseStripePortalFlowParams(new URLSearchParams("flow="))).toBe("invalid");
  });
});

describe("buildStripePortalFlowData", () => {
  it("builds a cancel flow scoped to the subscription", () => {
    expect(buildStripePortalFlowData({ kind: "cancel" }, { id: "sub_1", itemId: null }, null)).toEqual({
      type: "subscription_cancel",
      subscription_cancel: { subscription: "sub_1" },
    });
  });

  it("builds an update-confirm flow targeting the new price", () => {
    expect(
      buildStripePortalFlowData({ kind: "switch", plan: "studio" }, { id: "sub_1", itemId: "si_1" }, "price_studio")
    ).toEqual({
      type: "subscription_update_confirm",
      subscription_update_confirm: {
        subscription: "sub_1",
        items: [{ id: "si_1", price: "price_studio", quantity: 1 }],
      },
    });
  });

  it("returns null for a switch without a subscription item or target price", () => {
    expect(
      buildStripePortalFlowData({ kind: "switch", plan: "pro" }, { id: "sub_1", itemId: null }, "price_pro")
    ).toBeNull();
    expect(
      buildStripePortalFlowData({ kind: "switch", plan: "pro" }, { id: "sub_1", itemId: "si_1" }, null)
    ).toBeNull();
  });
});
