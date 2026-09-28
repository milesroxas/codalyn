#!/usr/bin/env node
/**
 * Read-only migration status for a Tower database: which Drizzle migrations from
 * drizzle/meta/_journal.json are applied and which are pending. Never runs a migration.
 *
 * Usage (from repo root: `pnpm app tower db:migrate:status:<target>`):
 *   node scripts/db-migration-status-cli.mjs local
 *   node scripts/db-migration-status-cli.mjs dev [--vercel]
 *   node scripts/db-migration-status-cli.mjs preview [--vercel]
 *   node scripts/db-migration-status-cli.mjs prod [--vercel]
 *
 * Exit codes: 0 = nothing pending, 2 = pending migrations remain, 1 = database not resolved or unreachable.
 * `prod` needs no `--confirm`: the only query is a SELECT on drizzle.__drizzle_migrations.
 *
 * Why this exists: production deploys from CI on every green push to `main` and nothing in that pipeline
 * runs migrations, so "did the migration land before the deploy?" must be answerable without touching the
 * database (2026-09-28, migration 0038).
 */
import { parseDbScriptArgs } from "./db-env.mjs";
import {
  fetchMigrationStatus,
  logMigrateTarget,
  logMigrationStatusSummary,
  resolveMigrateDatabaseUrl,
} from "./db-migration-status.mjs";

async function main() {
  const { target, useVercel } = parseDbScriptArgs(process.argv);

  let databaseUrl;
  try {
    // `confirmed: true` lifts only the prod `--confirm` gate, which guards writes; this script reads.
    databaseUrl = resolveMigrateDatabaseUrl(target, { useVercel, confirmed: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  logMigrateTarget(target, databaseUrl);
  const status = await fetchMigrationStatus(databaseUrl);
  logMigrationStatusSummary(status);
  process.exit(status.pending.length === 0 ? 0 : 2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
