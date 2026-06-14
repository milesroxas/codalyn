import {
  type FlintAppSettings,
  type FlintCustomPresets,
  type FlintOrgTeamSettings,
  type FlintRuleConfig,
  getDefaultFlintAppSettings,
  mergeFlintAppSettings,
  parseFlintAppSettings,
} from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { flintAppSettings as flintAppSettingsTable, organization } from "@/shared/lib/db/auth-schema";

function mergeOrgTeamPayload(
  existing: FlintOrgTeamSettings | null | undefined,
  patch: Partial<FlintOrgTeamSettings>
): FlintOrgTeamSettings {
  return { ...(existing ?? {}), ...patch };
}

export type UserFlintPersist = {
  /** Personal app-settings patch (theme, window, personal ignore lists, active preset). */
  settingsPatch?: Partial<FlintAppSettings>;
  /** Full replacement of the personal rule-config file (null clears it). */
  ruleConfig?: FlintRuleConfig | null;
  /** Full replacement of the personal custom presets (null/[] clears them). */
  customPresets?: FlintCustomPresets | null;
};

/** Upsert a user's personal Flint row, merging the app-settings patch and replacing the other columns when provided. */
export async function upsertUserFlintPayload(userId: string, input: UserFlintPersist): Promise<void> {
  const rows = await db.select().from(flintAppSettingsTable).where(eq(flintAppSettingsTable.userId, userId)).limit(1);
  const existingRow = rows[0];

  const base: FlintAppSettings = existingRow?.payload
    ? parseFlintAppSettings(existingRow.payload)
    : getDefaultFlintAppSettings();
  const nextPayload = input.settingsPatch ? mergeFlintAppSettings(base, input.settingsPatch) : base;

  const nextRuleConfig = input.ruleConfig !== undefined ? input.ruleConfig : (existingRow?.ruleConfig ?? null);
  const nextCustomPresets =
    input.customPresets !== undefined ? input.customPresets : (existingRow?.customPresets ?? null);

  await db
    .insert(flintAppSettingsTable)
    .values({
      userId,
      payload: nextPayload,
      ruleConfig: nextRuleConfig,
      customPresets: nextCustomPresets,
    })
    .onConflictDoUpdate({
      target: flintAppSettingsTable.userId,
      set: {
        payload: nextPayload,
        ruleConfig: nextRuleConfig,
        customPresets: nextCustomPresets,
        updatedAt: new Date(),
      },
    });
}

/**
 * Persist a team Flint patch onto the target organization. No-op unless the
 * caller can manage team settings and a target org is resolved — the route is
 * responsible for rejecting unauthorized team mutations before calling this.
 */
export async function persistTeamFlintPatch(opts: {
  teamPatch: Partial<FlintOrgTeamSettings>;
  canManageTeam: boolean;
  targetOrgId: string | null;
}): Promise<void> {
  const { teamPatch, canManageTeam, targetOrgId } = opts;
  if (Object.keys(teamPatch).length === 0) {
    return;
  }
  if (!canManageTeam || !targetOrgId) {
    return;
  }
  const orgRows = await db
    .select({ flintTeamSettings: organization.flintTeamSettings })
    .from(organization)
    .where(eq(organization.id, targetOrgId))
    .limit(1);
  const existingOrg = orgRows[0]?.flintTeamSettings ?? null;
  const nextOrg = mergeOrgTeamPayload(existingOrg, teamPatch);
  await db.update(organization).set({ flintTeamSettings: nextOrg }).where(eq(organization.id, targetOrgId));
}
