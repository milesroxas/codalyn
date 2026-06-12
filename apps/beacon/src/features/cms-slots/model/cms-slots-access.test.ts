import { describe, expect, it } from "vitest";
import {
  canAccessCmsSlotsDesigner,
  computeEditorExperienceFromMembership,
  defaultCmsSlotsRouteSegment,
  resolveAllowedCmsSlotsSegment,
  shouldShowCmsSlotsComposerDesignerNotReadyEmpty,
  shouldShowCmsSlotsComposerInstallInDesignerEmpty,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
  shouldShowCmsSlotsPreInstall,
} from "@/features/cms-slots/model/cms-slots-access";

describe("cms-slots-access", () => {
  it("allows Designer for designers and admins in designer view", () => {
    expect(canAccessCmsSlotsDesigner(false)).toBe(true);
    expect(defaultCmsSlotsRouteSegment(false)).toBe("designer");
    expect(computeEditorExperienceFromMembership("designer", false)).toBe(false);
    expect(computeEditorExperienceFromMembership("admin", false)).toBe(false);
  });

  it("restricts editors and editor-mode admins to Composer", () => {
    expect(canAccessCmsSlotsDesigner(true)).toBe(false);
    expect(defaultCmsSlotsRouteSegment(true)).toBe("composer");
    expect(resolveAllowedCmsSlotsSegment("designer", true)).toBe("composer");
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

  it("shows composer install-in-designer empty only for designer-capable members before install", () => {
    expect(
      shouldShowCmsSlotsComposerInstallInDesignerEmpty({
        canAccessDesigner: false,
        routeStateKnown: true,
        beaconsWrapperInstalled: false,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerInstallInDesignerEmpty({
        canAccessDesigner: true,
        routeStateKnown: false,
        beaconsWrapperInstalled: false,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerInstallInDesignerEmpty({
        canAccessDesigner: true,
        routeStateKnown: true,
        beaconsWrapperInstalled: false,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsComposerInstallInDesignerEmpty({
        canAccessDesigner: true,
        routeStateKnown: true,
        beaconsWrapperInstalled: true,
      })
    ).toBe(false);
  });

  it("shows composer designer-not-ready empty only for designer-capable members after install with no eligible lists", () => {
    expect(
      shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
        canAccessDesigner: false,
        composerListSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
        canAccessDesigner: true,
        composerListSettled: false,
        beaconsWrapperInstalled: true,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
        canAccessDesigner: true,
        composerListSettled: true,
        beaconsWrapperInstalled: false,
        eligibleCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
        canAccessDesigner: true,
        composerListSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 0,
      })
    ).toBe(true);
    expect(
      shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
        canAccessDesigner: true,
        composerListSettled: true,
        beaconsWrapperInstalled: true,
        eligibleCount: 1,
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
