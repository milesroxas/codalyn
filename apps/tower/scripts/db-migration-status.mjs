import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  assertLocalDatabaseHost,
  describeDatabaseHost,
  readTowerEnvFiles,
  resolveDatabaseUrl,
  towerRoot,
} from "./db-env.mjs";

const drizzleDir = join(towerRoot, "drizzle");
const journalPath = join(drizzleDir, "meta", "_journal.json");

/** @returns {Array<{ idx: number; tag: string; when: number }>} */
export function readMigrationJournal() {
  if (!existsSync(journalPath)) {
    throw new Error(`Missing Drizzle journal: ${journalPath}`);
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new Error("Drizzle journal has no entries.");
  }
  return journal.entries;
}

/**
 * Same DATABASE_URL resolution as drizzle.config.ts for local runs.
 * @param {"local" | "dev" | "preview" | "prod" | "production"} target
 * @param {{ useVercel?: boolean; confirmed?: boolean }} opts
 */
export function resolveMigrateDatabaseUrl(target, opts = {}) {
  const normalized = target.toLowerCase();
  if (normalized === "local") {
    let url = process.env.DATABASE_URL?.trim();
    if (!url) {
      url = readTowerEnvFiles().DATABASE_URL?.trim();
    }
    if (!url) {
      throw new Error(
        "DATABASE_URL is missing. Set it in apps/tower/.env or apps/tower/.env.local before running db:migrate:local."
      );
    }
    assertLocalDatabaseHost(url);
    return url;
  }
  return resolveDatabaseUrl(normalized, opts);
}

/**
 * @param {string} databaseUrl
 * @returns {Promise<{
 *   journal: Array<{ idx: number; tag: string; when: number }>;
 *   pending: Array<{ idx: number; tag: string; when: number }>;
 *   appliedCount: number;
 *   tableExists: boolean;
 * }>}
 */
export async function fetchMigrationStatus(databaseUrl) {
  const journal = readMigrationJournal();
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const tableCheck = await client.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
      ) AS exists`
    );
    const tableExists = Boolean(tableCheck.rows[0]?.exists);
    if (!tableExists) {
      return { journal, pending: journal, appliedCount: 0, tableExists: false };
    }

    const applied = await client.query(`SELECT created_at FROM drizzle.__drizzle_migrations`);
    const appliedWhen = new Set(applied.rows.map((row) => String(row.created_at)));
    const pending = journal.filter((entry) => !appliedWhen.has(String(entry.when)));
    return {
      journal,
      pending,
      appliedCount: appliedWhen.size,
      tableExists: true,
    };
  } finally {
    await client.end();
  }
}

/** @param {Array<{ tag: string }>} entries */
function formatMigrationTags(entries) {
  return entries.map((entry) => entry.tag).join(", ");
}

/** @param {{ journal: Array<{ tag: string }>; pending: Array<{ tag: string }>; appliedCount: number; tableExists: boolean }} status */
export function logMigrationStatusSummary(status) {
  const total = status.journal.length;
  const applied = total - status.pending.length;

  if (!status.tableExists) {
    console.log(`Migration status: no drizzle.__drizzle_migrations table yet (0/${total} applied).`);
    console.log(`Pending migrations (${total}): ${formatMigrationTags(status.pending)}`);
    return;
  }

  if (status.pending.length === 0) {
    console.log(`Migration status: database is up to date (${applied}/${total} applied).`);
    return;
  }

  console.log(`Migration status: ${status.pending.length} pending (${applied}/${total} applied).`);
  console.log(`Pending: ${formatMigrationTags(status.pending)}`);
}

/** @param {{ before: { pending: Array<{ tag: string }> }; after: { pending: Array<{ tag: string }>; appliedCount: number; journal: Array<{ tag: string }> } }} result */
export function logMigrationRunResult(result) {
  console.log("");
  const appliedNow = result.before.pending.filter(
    (entry) => !result.after.pending.some((pending) => pending.tag === entry.tag)
  );
  const total = result.after.journal.length;

  if (appliedNow.length === 0) {
    if (result.before.pending.length === 0) {
      console.log(`Done. Database was already up to date (${result.after.appliedCount}/${total} applied).`);
    } else {
      console.log("Done. Migrate finished, but pending migrations remain — check errors above.");
      logMigrationStatusSummary(result.after);
    }
    return;
  }

  console.log(
    `Done. Applied ${appliedNow.length} migration${appliedNow.length === 1 ? "" : "s"}: ${formatMigrationTags(appliedNow)} (${result.after.appliedCount}/${total} applied).`
  );
  if (result.after.pending.length > 0) {
    console.log(`Still pending: ${formatMigrationTags(result.after.pending)}`);
  }
}

/**
 * @param {"local" | "dev" | "preview" | "prod" | "production"} target
 * @param {string} databaseUrl
 */
export function logMigrateTarget(target, databaseUrl) {
  if (target === "local") {
    console.log(`Target: local (${describeDatabaseHost(databaseUrl)})`);
    return;
  }
  console.log(`Target: ${target} (${describeDatabaseHost(databaseUrl)})`);
}
