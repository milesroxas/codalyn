import { describe, expect, it } from "vitest";
import { BEACON_HOME_PATH, resolveBeaconRouteParent, resolveUpNavigation } from "@/app/beacon-route-hierarchy";

describe("resolveBeaconRouteParent", () => {
  it("maps flat feature routes to the Home hub", () => {
    expect(resolveBeaconRouteParent("/cms-slots")).toBe(BEACON_HOME_PATH);
    expect(resolveBeaconRouteParent("/cms-slots/designer")).toBe(BEACON_HOME_PATH);
    expect(resolveBeaconRouteParent("/images")).toBe(BEACON_HOME_PATH);
    expect(resolveBeaconRouteParent("/images/edit")).toBe(BEACON_HOME_PATH);
  });

  it("returns null for the hub and routes without an up control", () => {
    expect(resolveBeaconRouteParent("/home")).toBeNull();
    expect(resolveBeaconRouteParent("/settings")).toBeNull();
    expect(resolveBeaconRouteParent("/unknown")).toBeNull();
  });
});

describe("resolveUpNavigation", () => {
  it("pops to the parent's nearest earlier entry", () => {
    const entries = ["/home", "/cms-slots/designer"];
    expect(resolveUpNavigation(entries, 1, "/home")).toEqual({ kind: "pop", delta: -1 });
  });

  it("collapses a tool-to-tool ping-pong to the single Home entry", () => {
    // Home → Images → CMS Slots → Images: temporal back would bounce; up pops straight to Home.
    const entries = ["/home", "/images", "/cms-slots/designer", "/images"];
    expect(resolveUpNavigation(entries, 3, "/home")).toEqual({ kind: "pop", delta: -3 });
  });

  it("targets the most recent parent occurrence when it repeats", () => {
    const entries = ["/home", "/images", "/home", "/cms-slots/designer"];
    expect(resolveUpNavigation(entries, 3, "/home")).toEqual({ kind: "pop", delta: -1 });
  });

  it("pushes the parent when it is absent from the back stack (deep link)", () => {
    const entries = ["/cms-slots/designer"];
    expect(resolveUpNavigation(entries, 0, "/home")).toEqual({ kind: "push", to: "/home" });
  });

  it("pushes the parent at the first history entry", () => {
    const entries = ["/images"];
    expect(resolveUpNavigation(entries, 0, "/home")).toEqual({ kind: "push", to: "/home" });
  });

  it("ignores forward entries beyond the current index", () => {
    // Stale forward entries (after navigating back) must not be treated as the parent.
    const entries = ["/cms-slots/designer", "/images", "/home"];
    expect(resolveUpNavigation(entries, 1, "/home")).toEqual({ kind: "push", to: "/home" });
  });

  it("always produces a negative delta for pops", () => {
    const entries = ["/home", "/images", "/cms-slots/designer"];
    const plan = resolveUpNavigation(entries, 2, "/home");
    expect(plan.kind).toBe("pop");
    if (plan.kind === "pop") {
      expect(plan.delta).toBeLessThan(0);
    }
  });
});
