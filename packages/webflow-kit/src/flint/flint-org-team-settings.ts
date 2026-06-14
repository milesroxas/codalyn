import type { z } from "zod";

import { type FlintAppSettings, flintAppSettingsSchema, mergeFlintAppSettings } from "./flint-app-settings.js";
import { type FlintCustomPresets, flintCustomPresetsSchema } from "./flint-custom-presets.js";
import { type FlintRuleConfig, flintRuleConfigSchema } from "./flint-rule-config.js";

/**
 * Team-shareable Flint settings, stored on the organization. Studio/Team admins
 * configure these once and they override personal config for all members.
 *
 * Two kinds of fields:
 *  - app-settings overrides (ignore lists) — merged into a member's `FlintAppSettings`
 *  - separate entities (rule-config, custom presets) — overlaid by the Flint app
 */

const flintOrgTeamAppFieldsSchema = flintAppSettingsSchema.pick({
  globalIgnoredClasses: true,
  presetIgnoredClasses: true,
});

export const flintOrgTeamSettingsSchema = flintOrgTeamAppFieldsSchema.partial().extend({
  /** Team-shared rule-config overlay (applied over a member's personal config). */
  ruleConfig: flintRuleConfigSchema.optional(),
  /** Team-shared custom presets (override personal presets sharing an id). */
  customPresets: flintCustomPresetsSchema.optional(),
});

export type FlintOrgTeamSettings = z.infer<typeof flintOrgTeamSettingsSchema>;

export function parseFlintOrgTeamSettings(raw: unknown): FlintOrgTeamSettings {
  const parsed = flintOrgTeamSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export function parseFlintOrgTeamSettingsPartial(raw: unknown): Partial<FlintOrgTeamSettings> {
  const parsed = flintOrgTeamSettingsSchema.partial().safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/**
 * Applies team app-settings overrides (ignore lists) over a member's personal
 * settings. Rule-config and custom presets are NOT merged here — they are
 * separate entities overlaid by the Flint app via `mergeFlintRuleConfig` /
 * `mergeFlintCustomPresets`; this keeps app-settings merge pure and total.
 */
export function mergeFlintOrgTeamSettingsIntoUser(
  user: FlintAppSettings,
  org: FlintOrgTeamSettings | null | undefined
): FlintAppSettings {
  if (!org) {
    return user;
  }
  const patch: Partial<FlintAppSettings> = {};
  if (org.globalIgnoredClasses !== undefined) {
    patch.globalIgnoredClasses = org.globalIgnoredClasses;
  }
  if (org.presetIgnoredClasses !== undefined) {
    patch.presetIgnoredClasses = org.presetIgnoredClasses;
  }
  if (Object.keys(patch).length === 0) {
    return user;
  }
  return mergeFlintAppSettings(user, patch);
}

/** Extract the team-shared rule-config from a team settings blob (or null). */
export function selectFlintTeamRuleConfig(org: FlintOrgTeamSettings | null | undefined): FlintRuleConfig | null {
  return org?.ruleConfig ?? null;
}

/** Extract the team-shared custom presets from a team settings blob. */
export function selectFlintTeamCustomPresets(org: FlintOrgTeamSettings | null | undefined): FlintCustomPresets {
  return org?.customPresets ?? [];
}
