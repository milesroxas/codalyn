#!/usr/bin/env node
/**
 * Resolve DATABASE_URL and run `drizzle-kit migrate` for Tower.
 *
 * Usage (from repo root: `pnpm app tower db:migrate:<target>`):
 *   node scripts/db-migrate.mjs local
 *   node scripts/db-migrate.mjs dev [--vercel]
 *   node scripts/db-migrate.mjs preview [--vercel]
 *   node scripts/db-migrate.mjs prod [--vercel] [--confirm]
 *
 * `--vercel` ignores local TOWER_* overrides and uses Vercel env pull only.
 * `prod` requires `--confirm` (or TOWER_DB_MIGRATE_CONFIRM=1 in CI).
 */
import { spawnSync } from "node:child_process";
import { parseDbScriptArgs, towerRoot } from "./db-env.mjs";
import {
  fetchMigrationStatus,
  logMigrateTarget,
  logMigrationRunResult,
  logMigrationStatusSummary,
  resolveMigrateDatabaseUrl,
} from "./db-migration-status.mjs";

function mergeEnvForChild(base, databaseUrl) {
  const env = { ...base };
  if (databaseUrl) {
    env.DATABASE_URL = databaseUrl;
  } else {
    delete env.DATABASE_URL;
  }
  return env;
}

function runDrizzleMigrate(databaseUrl) {
  const r = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
    cwd: towerRoot,
    env: mergeEnvForChild(process.env, databaseUrl),
    stdio: "inherit",
  });
  return r.status ?? 1;
}

async function main() {
  const { target, useVercel, confirmed } = parseDbScriptArgs(process.argv);

  let databaseUrl;
  try {
    databaseUrl = resolveMigrateDatabaseUrl(target, { useVercel, confirmed });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  logMigrateTarget(target, databaseUrl);

  let before;
  try {
    before = await fetchMigrationStatus(databaseUrl);
    logMigrationStatusSummary(before);
  } catch (error) {
    console.warn(
      `Could not read migration status (${error instanceof Error ? error.message : error}). Continuing with migrate…`
    );
  }

  const exitCode = runDrizzleMigrate(target === "local" ? undefined : databaseUrl);
  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  if (!before) {
    return;
  }

  try {
    const after = await fetchMigrationStatus(databaseUrl);
    logMigrationRunResult({ before, after });
  } catch (error) {
    console.warn(`Could not verify migration status after migrate: ${error instanceof Error ? error.message : error}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
