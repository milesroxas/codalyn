/**
 * CMS Slots route access mirrors Tower `computeBeaconEditorExperience`:
 * editors and admins in editor-style mode use Composer only; designers and admins in designer view use Designer + Composer.
 */
export type CmsSlotsRouteSegment = "designer" | "composer";

function isTowerTeamAdminRole(role: string): boolean {
  return role === "admin" || role === "owner";
}

/** Client mirror of Tower `computeBeaconEditorExperience` (uses synced membership fields). */
export function computeEditorExperienceFromMembership(
  workspaceMemberRole: string | null,
  restrictToEditorExperience: boolean
): boolean {
  const normalized = workspaceMemberRole?.trim();
  if (!normalized) {
    return false;
  }
  const role = normalized.toLowerCase();
  if (role === "editor" || role === "member") {
    return true;
  }
  if (isTowerTeamAdminRole(role) && restrictToEditorExperience) {
    return true;
  }
  return false;
}

export function canAccessCmsSlotsDesigner(editorExperience: boolean): boolean {
  return !editorExperience;
}

export function defaultCmsSlotsRouteSegment(editorExperience: boolean): CmsSlotsRouteSegment {
  return editorExperience ? "composer" : "designer";
}

/** Coerce a requested segment when Designer is not permitted for the current member. */
export function resolveAllowedCmsSlotsSegment(
  segment: CmsSlotsRouteSegment,
  editorExperience: boolean
): CmsSlotsRouteSegment {
  if (segment === "designer" && editorExperience) {
    return "composer";
  }
  return segment;
}

/** Pre-install prompt only after the route knows wrapper install state (avoids flashing install before scan). */
export function shouldShowCmsSlotsPreInstall(input: {
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
}): boolean {
  return input.routeStateKnown && !input.beaconsWrapperInstalled;
}

/** Composer list: prompt Designer install (no install control) for members who can access Designer. */
export function shouldShowCmsSlotsComposerInstallInDesignerEmpty(input: {
  canAccessDesigner: boolean;
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
}): boolean {
  return (
    input.canAccessDesigner &&
    shouldShowCmsSlotsPreInstall({
      routeStateKnown: input.routeStateKnown,
      beaconsWrapperInstalled: input.beaconsWrapperInstalled,
    })
  );
}

/** Composer list: installed but no slot has an Designer-configured component ready for composing. */
export function shouldShowCmsSlotsComposerDesignerNotReadyEmpty(input: {
  canAccessDesigner: boolean;
  /** True once page scan, runtime status, and composer eligibility have all settled. */
  composerListSettled: boolean;
  beaconsWrapperInstalled: boolean;
  eligibleCount: number;
}): boolean {
  if (!input.canAccessDesigner || !input.composerListSettled || !input.beaconsWrapperInstalled) {
    return false;
  }
  return input.eligibleCount === 0;
}

/** Composer list panel: editor-only empty state when install/scan finished and no lists are available. */
export function shouldShowCmsSlotsEditorNoSlotsEmpty(input: {
  composerOnly: boolean;
  /** True once page scan, runtime status, and composer eligibility have all settled. */
  composerListSettled: boolean;
  beaconsWrapperInstalled: boolean;
  eligibleCount: number;
}): boolean {
  if (!input.composerOnly || !input.composerListSettled) {
    return false;
  }
  if (!input.beaconsWrapperInstalled) {
    return true;
  }
  return input.eligibleCount === 0;
}
