import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { fetchSubscriptionCancelAt, readSubscriptionCancelAt } from "@/server/billing/stripe-subscription-cancellation";

const CANCEL_AT_EPOCH_SECONDS = 1_785_024_000; // 2026-07-31T08:00:00Z

function subWithCancelAt(cancelAt: unknown): Pick<Stripe.Subscription, "cancel_at"> {
  return { cancel_at: cancelAt } as Pick<Stripe.Subscription, "cancel_at">;
}

describe("readSubscriptionCancelAt", () => {
  it("maps epoch seconds to a Date (canonical shape)", () => {
    expect(readSubscriptionCancelAt(subWithCancelAt(CANCEL_AT_EPOCH_SECONDS))).toEqual(
      new Date(CANCEL_AT_EPOCH_SECONDS * 1000)
    );
  });

  it("returns null when no cancellation is scheduled", () => {
    expect(readSubscriptionCancelAt(subWithCancelAt(null))).toBeNull();
    expect(readSubscriptionCancelAt(subWithCancelAt(undefined))).toBeNull();
  });

  it("returns null for malformed boundary values", () => {
    expect(readSubscriptionCancelAt(subWithCancelAt(String(CANCEL_AT_EPOCH_SECONDS)))).toBeNull();
    expect(readSubscriptionCancelAt(subWithCancelAt(Number.NaN))).toBeNull();
    expect(readSubscriptionCancelAt(subWithCancelAt({ value: CANCEL_AT_EPOCH_SECONDS }))).toBeNull();
  });
});

describe("fetchSubscriptionCancelAt", () => {
  it("returns the scheduled cancellation from the retrieved subscription", async () => {
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({ cancel_at: CANCEL_AT_EPOCH_SECONDS }),
      },
    } as unknown as Stripe;

    await expect(fetchSubscriptionCancelAt(stripe, "sub_123")).resolves.toEqual(
      new Date(CANCEL_AT_EPOCH_SECONDS * 1000)
    );
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
  });

  it("returns null when the Stripe fetch fails (view omits the notice instead of erroring)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stripe = {
      subscriptions: {
        retrieve: vi.fn().mockRejectedValue(new Error("stripe unreachable")),
      },
    } as unknown as Stripe;

    await expect(fetchSubscriptionCancelAt(stripe, "sub_123")).resolves.toBeNull();
    errorSpy.mockRestore();
  });
});
