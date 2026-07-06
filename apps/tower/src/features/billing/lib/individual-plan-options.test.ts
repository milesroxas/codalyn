import { describe, expect, it } from "vitest";
import {
  buildIndividualPlanOptions,
  type IndividualPlanOptionsInput,
} from "@/features/billing/lib/individual-plan-options";

function input(overrides: Partial<IndividualPlanOptionsInput> = {}): IndividualPlanOptionsInput {
  return {
    individualPlan: null,
    proCheckoutAvailable: true,
    studioCheckoutAvailable: true,
    portalAvailable: false,
    cancelPending: false,
    ...overrides,
  };
}

describe("buildIndividualPlanOptions", () => {
  it("offers checkout for both paid plans when on Free", () => {
    expect(buildIndividualPlanOptions(input())).toEqual([
      { key: "free", state: "current", action: null },
      { key: "pro", state: "upgrade", action: { kind: "subscribe", plan: "pro" } },
      { key: "studio", state: "upgrade", action: { kind: "subscribe", plan: "studio" } },
    ]);
  });

  it("keeps Free visible with a cancel action when on Pro", () => {
    expect(buildIndividualPlanOptions(input({ individualPlan: "pro", portalAvailable: true }))).toEqual([
      { key: "free", state: "downgrade", action: { kind: "cancel" } },
      { key: "pro", state: "current", action: null },
      { key: "studio", state: "upgrade", action: { kind: "switch", plan: "studio" } },
    ]);
  });

  it("keeps Free and Pro visible with downgrade actions when on Studio", () => {
    expect(buildIndividualPlanOptions(input({ individualPlan: "studio", portalAvailable: true }))).toEqual([
      { key: "free", state: "downgrade", action: { kind: "cancel" } },
      { key: "pro", state: "downgrade", action: { kind: "switch", plan: "pro" } },
      { key: "studio", state: "current", action: null },
    ]);
  });

  it("hides unconfigured paid plans that are not the current plan", () => {
    expect(
      buildIndividualPlanOptions(
        input({ individualPlan: "pro", portalAvailable: true, studioCheckoutAvailable: false })
      )
    ).toEqual([
      { key: "free", state: "downgrade", action: { kind: "cancel" } },
      { key: "pro", state: "current", action: null },
    ]);
  });

  it("always shows the current paid plan even when its price is unconfigured", () => {
    expect(
      buildIndividualPlanOptions(
        input({
          individualPlan: "studio",
          portalAvailable: true,
          proCheckoutAvailable: false,
          studioCheckoutAvailable: false,
        })
      )
    ).toEqual([
      { key: "free", state: "downgrade", action: { kind: "cancel" } },
      { key: "studio", state: "current", action: null },
    ]);
  });

  it("offers no cancel or switch actions without a Stripe portal", () => {
    expect(buildIndividualPlanOptions(input({ individualPlan: "pro", portalAvailable: false }))).toEqual([
      { key: "free", state: "downgrade", action: null },
      { key: "pro", state: "current", action: null },
      { key: "studio", state: "upgrade", action: null },
    ]);
  });

  it("offers no further plan actions while a cancellation is pending", () => {
    expect(
      buildIndividualPlanOptions(input({ individualPlan: "studio", portalAvailable: true, cancelPending: true }))
    ).toEqual([
      { key: "free", state: "downgrade", action: null },
      { key: "pro", state: "downgrade", action: null },
      { key: "studio", state: "current", action: null },
    ]);
  });

  it("does not offer subscribe actions for unconfigured checkout on Free", () => {
    expect(buildIndividualPlanOptions(input({ proCheckoutAvailable: false, studioCheckoutAvailable: false }))).toEqual([
      { key: "free", state: "current", action: null },
    ]);
  });
});
