import {
  type BeaconAppSettings,
  type BeaconOrgTeamSettings,
  getDefaultBeaconAppSettings,
  mergeBeaconAppSettings,
  parseBeaconAppSettings,
} from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { beaconAppSettings as beaconAppSettingsTable, organization } from "@/shared/lib/db/auth-schema";

function mergeOrgTeamPayload(
  existing: BeaconOrgTeamSettings | null | undefined,
  patch: Partial<BeaconOrgTeamSettings>
): BeaconOrgTeamSettings {
  return { ...(existing ?? {}), ...patch };
}

export async function upsertUserBeaconPayload(userId: string, mergePatch: Partial<BeaconAppSettings>): Promise<void> {
  const rows = await db.select().from(beaconAppSettingsTable).where(eq(beaconAppSettingsTable.userId, userId)).limit(1);
  const existingRow = rows[0];
  const base: BeaconAppSettings = existingRow?.payload
    ? parseBeaconAppSettings(existingRow.payload)
    : getDefaultBeaconAppSettings();
  const next = mergeBeaconAppSettings(base, mergePatch);
  await db
    .insert(beaconAppSettingsTable)
    .values({
      userId,
      payload: next,
    })
    .onConflictDoUpdate({
      target: beaconAppSettingsTable.userId,
      set: {
        payload: next,
        updatedAt: new Date(),
      },
    });
}

export async function persistTeamBeaconPatch(
  userId: string,
  opts: {
    teamPatch: Partial<BeaconOrgTeamSettings>;
    canManageTeam: boolean;
    targetOrgId: string | null;
  }
): Promise<void> {
  const { teamPatch, canManageTeam, targetOrgId } = opts;
  if (Object.keys(teamPatch).length === 0) {
    return;
  }
  if (!canManageTeam) {
    await upsertUserBeaconPayload(userId, teamPatch as Partial<BeaconAppSettings>);
    return;
  }
  if (targetOrgId) {
    const orgRows = await db
      .select({ beaconTeamSettings: organization.beaconTeamSettings })
      .from(organization)
      .where(eq(organization.id, targetOrgId))
      .limit(1);
    const existingOrg = orgRows[0]?.beaconTeamSettings ?? null;
    const nextOrg = mergeOrgTeamPayload(existingOrg, teamPatch);
    await db.update(organization).set({ beaconTeamSettings: nextOrg }).where(eq(organization.id, targetOrgId));
    return;
  }
  await upsertUserBeaconPayload(userId, teamPatch as Partial<BeaconAppSettings>);
}
