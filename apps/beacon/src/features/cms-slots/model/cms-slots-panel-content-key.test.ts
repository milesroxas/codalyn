import { describe, expect, it } from "vitest";
import {
  cmsSlotListTargetPhaseUnsettled,
  cmsSlotListTargetSettled,
} from "@/features/cms-slots/model/cms-slot-list-target-settled";
import {
  cmsSlotsComposerListDataReady,
  cmsSlotsComposerRouteContentKey,
  cmsSlotsComposerRouteContentReady,
  cmsSlotsEngineRouteContentKey,
  cmsSlotsEngineRouteContentReady,
  resolveCmsSlotsEngineRouteSurface,
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

describe("cmsSlotsEngineRouteSurface", () => {
  const idleHome = {
    picking: false,
    openingBeaconKey: null,
    routeStateKnown: true,
    pageBootBlocking: false,
    listTargetPhase: "synced" as const,
  };

  it("keeps home key while opening a slot", () => {
    expect(
      cmsSlotsEngineRouteContentKey({
        picking: true,
        openingBeaconKey: "beacon-1",
      })
    ).toBe("home");
  });

  it("uses composition key only after open completes", () => {
    expect(
      cmsSlotsEngineRouteContentKey({
        picking: true,
        openingBeaconKey: null,
      })
    ).toBe("composition");
  });

  it("stays hidden while opening", () => {
    expect(cmsSlotsEngineRouteContentReady({ ...idleHome, openingBeaconKey: "beacon-1" })).toBe(false);
  });

  it("does not hide home on background rescans", () => {
    expect(cmsSlotsEngineRouteContentReady({ ...idleHome, pageBootBlocking: false })).toBe(true);
    expect(cmsSlotsEngineRouteContentReady({ ...idleHome, pageBootBlocking: true })).toBe(false);
  });

  it("waits for list target reconcile before showing composition", () => {
    expect(
      resolveCmsSlotsEngineRouteSurface({
        ...idleHome,
        picking: true,
        listTargetPhase: "loading",
      })
    ).toEqual({ contentKey: "composition", contentReady: false });
  });

  it("shows composition once list target phase is synced", () => {
    expect(
      cmsSlotsEngineRouteContentReady({
        ...idleHome,
        picking: true,
        listTargetPhase: "synced",
      })
    ).toBe(true);
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
    composerEditingContextPhase: "ready" as const,
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

  it("waits for editing context on list", () => {
    expect(
      cmsSlotsComposerRouteContentReady({
        ...idleList,
        composerEditingContextPhase: "loading",
      })
    ).toBe(false);
  });

  it("does not hide list on background rescans", () => {
    expect(cmsSlotsComposerListDataReady({ ...idleList })).toBe(true);
    expect(cmsSlotsComposerListDataReady({ ...idleList, pageBootBlocking: true })).toBe(false);
  });
});
