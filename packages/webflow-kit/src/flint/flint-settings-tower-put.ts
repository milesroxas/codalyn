import type { FlintOrgTeamSettings } from "./flint-org-team-settings.js";
import { parseFlintOrgTeamSettingsPartial } from "./flint-org-team-settings.js";

/**
 * Error codes + permission policy for Tower `PUT /api/v1/flint/settings`.
 * Mirrors the Beacon settings-put policy: team-scoped mutations require manage
 * permission and are locked in editor-experience mode. Entitlement (paid tier)
 * is enforced separately on the server before any persistence.
 */
export const FLINT_SETTINGS_ERROR_CODES = {
  TEAM_CONFIG_LOCKED_EDITOR_MODE: "TEAM_CONFIG_LOCKED_EDITOR_MODE",
  TEAM_CONFIG_PERMISSION_DENIED: "TEAM_CONFIG_PERMISSION_DENIED",
  ORGANIZATION_CONTEXT_REQUIRED: "ORGANIZATION_CONTEXT_REQUIRED",
  ENTITLEMENT_REQUIRED: "ENTITLEMENT_REQUIRED",
} as const;

export type FlintSettingsErrorCode = (typeof FLINT_SETTINGS_ERROR_CODES)[keyof typeof FLINT_SETTINGS_ERROR_CODES];

export type FlintSettingsTowerPutPolicy = {
  editorExperience: boolean;
  canManageTeamFlintSettings: boolean;
};

export type FlintSettingsTowerPutRejection = Extract<
  FlintSettingsErrorCode,
  "TEAM_CONFIG_LOCKED_EDITOR_MODE" | "TEAM_CONFIG_PERMISSION_DENIED"
>;

/** True when the team patch carries any persistable team-scoped field. */
export function patchHasTeamFlintMutation(teamPatch: Partial<FlintOrgTeamSettings> | null | undefined): boolean {
  if (!teamPatch) {
    return false;
  }
  return Object.keys(parseFlintOrgTeamSettingsPartial(teamPatch)).length > 0;
}

/** Returns a rejection code when a team-scoped mutation is not permitted, else null. */
export function getFlintSettingsTowerPutRejection(
  teamPatch: Partial<FlintOrgTeamSettings> | null | undefined,
  policy: FlintSettingsTowerPutPolicy
): FlintSettingsTowerPutRejection | null {
  if (!patchHasTeamFlintMutation(teamPatch)) {
    return null;
  }
  if (policy.editorExperience) {
    return FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_LOCKED_EDITOR_MODE;
  }
  if (!policy.canManageTeamFlintSettings) {
    return FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_PERMISSION_DENIED;
  }
  return null;
}
