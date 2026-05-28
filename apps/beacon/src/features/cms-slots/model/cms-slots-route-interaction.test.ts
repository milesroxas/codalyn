import { describe, expect, it } from "vitest";
import {
  cmsSlotsDrawerDismissBlocked,
  cmsSlotsRouteInteractionBlocked,
} from "@/features/cms-slots/model/cms-slots-route-interaction";

describe("cmsSlotsRouteInteractionBlocked", () => {
  it("is false when the route surface is ready and idle", () => {
    expect(
      cmsSlotsRouteInteractionBlocked({
        routeBlocking: false,
        surfaceReady: true,
        overlayBlocking: false,
      })
    ).toBe(false);
  });

  it("blocks immediately when route work starts, before the deferred overlay appears", () => {
    expect(
      cmsSlotsRouteInteractionBlocked({
        routeBlocking: true,
        surfaceReady: true,
        overlayBlocking: false,
      })
    ).toBe(true);
  });

  it("blocks while the surface is still settling", () => {
    expect(
      cmsSlotsRouteInteractionBlocked({
        routeBlocking: false,
        surfaceReady: false,
        overlayBlocking: false,
      })
    ).toBe(true);
  });

  it("blocks while the visible route overlay covers the viewport", () => {
    expect(
      cmsSlotsRouteInteractionBlocked({
        routeBlocking: false,
        surfaceReady: true,
        overlayBlocking: true,
      })
    ).toBe(true);
  });
});

describe("cmsSlotsDrawerDismissBlocked", () => {
  it("blocks when any local busy flag is true", () => {
    expect(cmsSlotsDrawerDismissBlocked(false, true)).toBe(true);
  });

  it("is idle when all local flags are idle", () => {
    expect(cmsSlotsDrawerDismissBlocked(false, false)).toBe(false);
  });
});
