/**
 * CMS Slots route access mirrors Tower `computeBeaconEditorExperience`:
 * editors and admins in editor-style mode use Composer only; designers and admins in designer view use Engine + Composer.
 */
export type CmsSlotsRouteSegment = "engine" | "composer";

function isTowerTeamAdminRole(role: string): boolean {
  return role === "admin" || role === "owner";
}

/** Client mirror of Tower `computeBeaconEditorExperience` (uses synced membership fields). */
export function computeEditorExperienceFromMembership(
  workspaceMemberRole: string | null,
  restrictToEditorExperience: boolean
): boolean {
  if (!workspaceMemberRole) {
    return false;
  }
  const role = workspaceMemberRole.toLowerCase();
  if (role === "editor" || role === "member") {
    return true;
  }
  if (isTowerTeamAdminRole(role) && restrictToEditorExperience) {
    return true;
  }
  return false;
}

export function canAccessCmsSlotsEngine(editorExperience: boolean): boolean {
  return !editorExperience;
}

export function defaultCmsSlotsRouteSegment(editorExperience: boolean): CmsSlotsRouteSegment {
  return editorExperience ? "composer" : "engine";
}

/** Coerce a requested segment when Engine is not permitted for the current member. */
export function resolveAllowedCmsSlotsSegment(
  segment: CmsSlotsRouteSegment,
  editorExperience: boolean
): CmsSlotsRouteSegment {
  if (segment === "engine" && editorExperience) {
    return "composer";
  }
  return segment;
}

/** Composer list panel: editor-only empty state when install/scan finished and no lists are available. */
export function shouldShowCmsSlotsEditorNoSlotsEmpty(input: {
  composerOnly: boolean;
  scanSettled: boolean;
  beaconsWrapperInstalled: boolean;
  eligibleCount: number;
}): boolean {
  if (!input.composerOnly || !input.scanSettled) {
    return false;
  }
  if (!input.beaconsWrapperInstalled) {
    return true;
  }
  return input.eligibleCount === 0;
}
