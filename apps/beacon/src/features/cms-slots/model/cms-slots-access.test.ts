import { describe, expect, it } from "vitest";
import {
  canAccessCmsSlotsEngine,
  computeEditorExperienceFromMembership,
  defaultCmsSlotsRouteSegment,
  resolveAllowedCmsSlotsSegment,
  shouldShowCmsSlotsComposerInstallInEngineEmpty,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
  shouldShowCmsSlotsPreInstall,
} from "@/features/cms-slots/model/cms-slots-access";

describe("cms-slots-access", () => {
  it("allows Engine for designers and admins in designer view", () => {
    expect(canAccessCmsSlotsEngine(false)).toBe(true);
    expect(defaultCmsSlotsRouteSegment(false)).toBe("engine");
    expect(computeEditorExperienceFromMembership("designer", false)).toBe(false);
    expect(computeEditorExperienceFromMembership("admin", false)).toBe(false);
  });

  it("restricts editors and editor-mode admins to Composer", () => {
    expect(canAccessCmsSlotsEngine(true)).toBe(false);
    expect(defaultCmsSlotsRouteSegment(true)).toBe("composer");
    expect(resolveAllowedCmsSlotsSegment("engine", true)).toBe("composer");
    expect(resolveAllowedCmsSlotsSegment("composer", true)).toBe("composer");
    expect(computeEditorExperienceFromMembership("editor", false)).toBe(true);
    expect(computeEditorExperienceFromMembership(" member ", false)).toBe(true);
    expect(computeEditorExperienceFromMembership("admin", true)).toBe(true);
  });

  it("shows pre-install only after route install state is known", () => {
    expect(shouldShowCmsSlotsPreInstall({ routeStateKnown: false, beaconsWrapperInstalled: false })).toBe(false);
    expect(shouldShowCmsSlotsPreInstall({ routeStateKnown: true, beaconsWrapperInstalled: false })).toBe(true);
    expect(shouldShowCmsSlotsPreInstall({ routeStateKnown: true, beaconsWrapperInstalled: true })).toBe(false);
  });

  it("shows composer install-in-engine empty only for engine-capable members before install", () => {
    expect(
      shouldShowCmsSlotsComposerInstallInEngineEmpty({
        canAccessEngine: false,
        routeStateKnown: true,
        beaconsWrapperInstalled: false,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerInstallInEngineEmpty({
        canAccessEngine: true,
        routeStateKnown: false,
        beaconsWrapperInstalled: false,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerInstallInEngineEmpty({
        canAccessEngine: true,
        routeStateKnown: true,
        beaconsWrapperInstalled: false,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsComposerInstallInEngineEmpty({
        canAccessEngine: true,
        routeStateKnown: true,
        beaconsWrapperInstalled: true,
      })
    ).toBe(false);
  });

  it("shows editor no-slots empty only after composer list has fully settled", () => {
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: false,
        composerListSettled: true,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        composerListSettled: false,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        composerListSettled: true,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        composerListSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 0,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        composerListSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 2,
      })
    ).toBe(false);
  });
});
