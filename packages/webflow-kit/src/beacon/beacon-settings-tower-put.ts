import type { BeaconAppSettings } from "./beacon-app-settings.js";
import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode } from "./beacon-image-errors.js";
import { parseBeaconOrgTeamSettingsPartial, splitBeaconSettingsPatch } from "./beacon-org-team-settings.js";

export type BeaconSettingsTowerPutPolicy = {
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
};

export type BeaconSettingsTowerPutRejection = Extract<
  BeaconImageErrorCode,
  "TEAM_PRESETS_LOCKED_EDITOR_MODE" | "PRESET_PERMISSION_DENIED"
>;

function patchHasTeamSettingsMutation(patch: Partial<BeaconAppSettings>): boolean {
  const { team } = splitBeaconSettingsPatch(patch);
  return Object.keys(parseBeaconOrgTeamSettingsPartial(team)).length > 0;
}

/** Mirrors Tower `PUT /api/v1/beacon/settings` permission checks for team-scoped fields. */
export function getBeaconSettingsTowerPutRejection(
  patch: Partial<BeaconAppSettings>,
  policy: BeaconSettingsTowerPutPolicy
): BeaconSettingsTowerPutRejection | null {
  if (!patchHasTeamSettingsMutation(patch)) {
    return null;
  }
  if (policy.editorExperience) {
    return BEACON_IMAGE_ERROR_CODES.TEAM_PRESETS_LOCKED_EDITOR_MODE;
  }
  if (!policy.canManageTeamBeaconSettings) {
    return BEACON_IMAGE_ERROR_CODES.PRESET_PERMISSION_DENIED;
  }
  return null;
}

/** Personal fields Tower persists for editor-experience users (theme only). */
export function stripBeaconSettingsPersonalForEditorExperience(
  personal: Partial<BeaconAppSettings>
): Partial<BeaconAppSettings> {
  const out: Partial<BeaconAppSettings> = {};
  if (personal.theme !== undefined) {
    out.theme = personal.theme;
  }
  return out;
}

/** Whether export default fields may be synced to Tower under the current policy. */
export function canPersistBeaconTeamExportDefaults(policy: BeaconSettingsTowerPutPolicy): boolean {
  return (
    getBeaconSettingsTowerPutRejection({ defaultExportFormat: "webp", defaultExportQuality: 0.75 }, policy) === null
  );
}
