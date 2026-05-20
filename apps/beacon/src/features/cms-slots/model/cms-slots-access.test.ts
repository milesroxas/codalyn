import { describe, expect, it } from "vitest";
import {
  canAccessCmsSlotsEngine,
  computeEditorExperienceFromMembership,
  defaultCmsSlotsRouteSegment,
  resolveAllowedCmsSlotsSegment,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
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

  it("shows editor no-slots empty only after scan settles with nothing to open", () => {
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: false,
        scanSettled: true,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        scanSettled: false,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        scanSettled: true,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        scanSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 0,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsEditorNoSlotsEmpty({
        composerOnly: true,
        scanSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 2,
      })
    ).toBe(false);
  });
});
