import { describe, expect, it } from "vitest";
import {
  cmsSlotListTargetPhaseUnsettled,
  cmsSlotListTargetSettled,
} from "@/features/cms-slots/model/cms-slot-list-target-settled";
import {
  cmsSlotsComposerListDataReady,
  cmsSlotsComposerRouteContentKey,
  cmsSlotsComposerRouteContentReady,
  cmsSlotsDesignerRouteContentKey,
  cmsSlotsDesignerRouteContentReady,
  resolveCmsSlotsDesignerRouteSurface,
} from "@/features/cms-slots/model/cms-slots-panel-content-key";

describe("cmsSlotListTargetSettled", () => {
  it("is false while loading or updating", () => {
    expect(cmsSlotListTargetSettled("loading", true)).toBe(false);
    expect(cmsSlotListTargetSettled("updating", true)).toBe(false);
  });

  it("is false while synced canvas count is unresolved", () => {
    expect(cmsSlotListTargetSettled("synced", false)).toBe(false);
  });

  it("is true when synced and canvas count is resolved", () => {
    expect(cmsSlotListTargetSettled("synced", true)).toBe(true);
    expect(cmsSlotListTargetSettled("absent", true)).toBe(true);
  });

  it("matches phase unsettled helper", () => {
    expect(cmsSlotListTargetPhaseUnsettled("loading", true)).toBe(true);
    expect(cmsSlotListTargetSettled("loading", true)).toBe(!cmsSlotListTargetPhaseUnsettled("loading", true));
  });
});

describe("cmsSlotsDesignerRouteSurface", () => {
  const idleHome = {
    picking: false,
    openingBeaconKey: null,
    routeStateKnown: true,
    pageBootBlocking: false,
  };

  it("keeps home key while opening a slot", () => {
    expect(
      cmsSlotsDesignerRouteContentKey({
        picking: true,
        openingBeaconKey: "beacon-1",
      })
    ).toBe("home");
  });

  it("uses composition key only after open completes", () => {
    expect(
      cmsSlotsDesignerRouteContentKey({
        picking: true,
        openingBeaconKey: null,
      })
    ).toBe("composition");
  });

  it("keeps home visible while opening a slot so the tile spinner shows (no blank)", () => {
    expect(cmsSlotsDesignerRouteContentReady({ ...idleHome, openingBeaconKey: "beacon-1" })).toBe(true);
  });

  it("does not hide home on background rescans", () => {
    expect(cmsSlotsDesignerRouteContentReady({ ...idleHome, pageBootBlocking: false })).toBe(true);
    expect(cmsSlotsDesignerRouteContentReady({ ...idleHome, pageBootBlocking: true })).toBe(false);
  });

  it("shows composition immediately when picking, with inline list-target loading (no blank/overlay)", () => {
    // The composition panel renders its slot rows and its own inline list-target spinner, so opening a slot must
    // not blank the route behind a full-screen overlay while the list-target reconcile runs.
    expect(
      resolveCmsSlotsDesignerRouteSurface({
        ...idleHome,
        picking: true,
      })
    ).toEqual({ contentKey: "composition", contentReady: true });
  });
});

describe("cmsSlotsComposerRouteSurface", () => {
  const idleList = {
    activeComposer: null,
    composerOpeningKey: null,
    routeStateKnown: true,
    pageBootBlocking: false,
    pageRuntimeStatusLoading: false,
    composerEligibleLoading: false,
    composerEligibleResolved: true,
  };

  it("keeps list key while opening a composer entry", () => {
    expect(
      cmsSlotsComposerRouteContentKey({
        activeComposer: { beacon: {}, initialSignature: "sig" },
        composerOpeningKey: "beacon-1",
      })
    ).toBe("list");
  });

  it("uses composer key after open completes", () => {
    expect(
      cmsSlotsComposerRouteContentKey({
        activeComposer: { beacon: {}, initialSignature: "sig" },
        composerOpeningKey: null,
      })
    ).toBe("composer");
  });

  it("does not hide list on background rescans", () => {
    expect(cmsSlotsComposerListDataReady({ ...idleList })).toBe(true);
    expect(cmsSlotsComposerListDataReady({ ...idleList, pageBootBlocking: true })).toBe(false);
  });

  it("keeps the list visible while a slot is opening so the tile spinner shows (no blank)", () => {
    expect(
      cmsSlotsComposerRouteContentReady({
        ...idleList,
        composerOpeningKey: "beacon-1",
      })
    ).toBe(true);
  });

  it("is ready once the open completes (activeComposer set)", () => {
    expect(
      cmsSlotsComposerRouteContentReady({
        ...idleList,
        activeComposer: { beacon: {}, initialSignature: "sig" },
      })
    ).toBe(true);
  });

  it("keeps the list surface visible while eligibility is still scanning (inline loading, no blank)", () => {
    // Crossing designer -> composer must crossfade over real content, not strand a blank panel behind the
    // route overlay while the eligible-list scan runs. The panel renders its intro/card and fills the list inline.
    expect(
      cmsSlotsComposerRouteContentReady({
        ...idleList,
        composerEligibleResolved: false,
        composerEligibleLoading: true,
        pageRuntimeStatusLoading: true,
      })
    ).toBe(true);
  });
});
