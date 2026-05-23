#!/usr/bin/env node
/**
 * One-time data migration: normalize Beacon preset JSON in Postgres.
 *
 * Rewrites:
 * - `beacon_app_settings.payload`
 * - `organization.beacon_team_settings`
 *
 * Removes legacy keys (`imagePresets`, `designerOnlyImagePresets`, `imagePresetStorageV2`)
 * and persists canonical `imagePresetStorage`.
 *
 * Usage (from repo root):
 *   pnpm app tower db:beacon-preset-storage-migrate:local [--dry-run]
 *   pnpm app tower db:beacon-preset-storage-migrate:dev [--dry-run] [--vercel]
 *   pnpm app tower db:beacon-preset-storage-migrate:prod [--dry-run] [--vercel]
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  beaconAppSettingsPayloadNeedsMigration,
  beaconOrgTeamSettingsPayloadNeedsMigration,
  migrateBeaconAppSettingsPayload,
  migrateBeaconOrgTeamSettingsPayload,
  serializeBeaconAppSettingsPayload,
  serializeBeaconOrgTeamSettingsPayload,
} from "@codalyn/webflow-kit";
import pg from "pg";
import { resolveDatabaseUrl, towerRoot } from "./db-env.mjs";

function ensureWebflowKitBuilt() {
  const r = spawnSync("pnpm", ["exec", "turbo", "run", "build", "--filter=@codalyn/webflow-kit"], {
    cwd: resolve(towerRoot, "../.."),
    stdio: "inherit",
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function parseArgs(argv) {
  const args = argv.slice(2).filter((a) => a !== "--");
  const dryRun = args.includes("--dry-run");
  const useVercel = args.includes("--vercel");
  const positional = args.filter((a) => a !== "--dry-run" && a !== "--vercel");
  const target = (positional[0] || "local").toLowerCase();
  return { target, dryRun, useVercel };
}

async function migrateUserSettings(client, dryRun) {
  const result = await client.query(`SELECT user_id, payload FROM beacon_app_settings`);
  let scanned = 0;
  let updated = 0;

  for (const row of result.rows) {
    scanned += 1;
    const raw = row.payload;
    if (!beaconAppSettingsPayloadNeedsMigration(raw)) {
      continue;
    }
    updated += 1;
    const migrated = serializeBeaconAppSettingsPayload(migrateBeaconAppSettingsPayload(raw));
    if (dryRun) {
      console.log(`[dry-run] beacon_app_settings ${row.user_id}: would migrate preset storage`);
      continue;
    }
    await client.query(`UPDATE beacon_app_settings SET payload = $1::jsonb, updated_at = now() WHERE user_id = $2`, [
      JSON.stringify(migrated),
      row.user_id,
    ]);
    console.log(`Updated beacon_app_settings ${row.user_id}`);
  }

  return { scanned, updated };
}

async function migrateOrgTeamSettings(client, dryRun) {
  const result = await client.query(
    `SELECT id, beacon_team_settings FROM organization WHERE beacon_team_settings IS NOT NULL`
  );
  let scanned = 0;
  let updated = 0;

  for (const row of result.rows) {
    scanned += 1;
    const raw = row.beacon_team_settings;
    if (!beaconOrgTeamSettingsPayloadNeedsMigration(raw)) {
      continue;
    }
    updated += 1;
    const migrated = migrateBeaconOrgTeamSettingsPayload(raw);
    const serialized = migrated === null ? null : serializeBeaconOrgTeamSettingsPayload(migrated);
    if (dryRun) {
      console.log(`[dry-run] organization ${row.id}: would migrate beacon_team_settings preset storage`);
      continue;
    }
    await client.query(`UPDATE organization SET beacon_team_settings = $1::jsonb WHERE id = $2`, [
      serialized === null ? null : JSON.stringify(serialized),
      row.id,
    ]);
    console.log(`Updated organization ${row.id}`);
  }

  return { scanned, updated };
}

async function main() {
  ensureWebflowKitBuilt();

  const { target, dryRun, useVercel } = parseArgs(process.argv);
  let databaseUrl;
  try {
    databaseUrl = resolveDatabaseUrl(target, { useVercel });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Set it in the environment or apps/tower/.env.local");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log(
      dryRun
        ? `Dry run: scanning Beacon preset storage in ${target} database…`
        : `Migrating Beacon preset storage in ${target} database…`
    );
    const users = await migrateUserSettings(client, dryRun);
    const orgs = await migrateOrgTeamSettings(client, dryRun);
    console.log(
      `Done. User settings: ${users.updated}/${users.scanned} updated. Organization team settings: ${orgs.updated}/${orgs.scanned} updated.`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
