import { useMemo } from "react";
import {
  type CmsSlotsRouteSegment,
  canAccessCmsSlotsEngine,
  computeEditorExperienceFromMembership,
  defaultCmsSlotsRouteSegment,
} from "@/features/cms-slots/model/cms-slots-access";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";

export type CmsSlotsAccess = {
  /** Effective editor-style mode (Tower flag + membership fallback). */
  editorExperience: boolean;
  /** Role flags are authoritative once Tower settings have synced (or user is unsigned). */
  accessResolved: boolean;
  canAccessEngine: boolean;
  /** True when the member only uses Composer (no Engine tab in the dock). */
  composerOnly: boolean;
  defaultSegment: CmsSlotsRouteSegment;
};

export function useCmsSlotsAccess(): CmsSlotsAccess {
  const { editorExperience, restrictToEditorExperience, workspaceMemberRole, syncState, isTowerUser } =
    useBeaconAppSettings();
  const accessResolved = !isTowerUser || syncState === "synced";

  return useMemo(() => {
    const membershipEditorExperience = computeEditorExperienceFromMembership(
      workspaceMemberRole,
      restrictToEditorExperience
    );
    const effectiveEditorExperience = editorExperience || (accessResolved && membershipEditorExperience);
    const canAccessEngine = accessResolved ? canAccessCmsSlotsEngine(effectiveEditorExperience) : false;
    const defaultSegment = accessResolved
      ? defaultCmsSlotsRouteSegment(effectiveEditorExperience)
      : ("composer" satisfies CmsSlotsRouteSegment);

    return {
      editorExperience: effectiveEditorExperience,
      accessResolved,
      canAccessEngine,
      composerOnly: !canAccessEngine,
      defaultSegment,
    };
  }, [accessResolved, editorExperience, restrictToEditorExperience, workspaceMemberRole]);
}
