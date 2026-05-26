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
import { describeDatabaseHost, parseDbScriptArgs, resolveDatabaseUrl, towerRoot } from "./db-env.mjs";

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
  process.exit(r.status ?? 1);
}

function main() {
  const { target, useVercel, confirmed } = parseDbScriptArgs(process.argv);

  if (target === "local") {
    runDrizzleMigrate(undefined);
    return;
  }

  try {
    const databaseUrl = resolveDatabaseUrl(target, { useVercel, confirmed });
    console.log(`Migrating ${target} database at ${describeDatabaseHost(databaseUrl)}`);
    runDrizzleMigrate(databaseUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
