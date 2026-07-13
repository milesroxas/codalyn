#!/usr/bin/env node
/**
 * Resolve DATABASE_URL and run `payload migrate` (CMS tables in the `payload` pg schema).
 *
 * Usage (from apps/tower):
 *   node scripts/payload-migrate.mjs local
 *   node scripts/payload-migrate.mjs dev [--vercel]
 *   node scripts/payload-migrate.mjs preview [--vercel]
 *   node scripts/payload-migrate.mjs prod [--vercel] [--confirm]
 *
 * Target resolution, safety rails (local-host refusal, prod --confirm, Neon-only prod)
 * are shared with the drizzle flow via db-env.mjs. `--vercel` ignores local TOWER_*
 * overrides and uses Vercel env pull only.
 */
import { spawnSync } from "node:child_process";
import {
  describeDatabaseHost,
  parseDbScriptArgs,
  readTowerEnvFiles,
  resolveDatabaseUrl,
  towerRoot,
} from "./db-env.mjs";

function resolvePayloadSecret() {
  const fileEnv = readTowerEnvFiles();
  // Migrations only need the DB; the secret just satisfies config validation.
  return (process.env.PAYLOAD_SECRET || fileEnv.PAYLOAD_SECRET || "").trim() || "payload-migrate-placeholder";
}

function runPayloadMigrate(databaseUrl) {
  const env = { ...process.env, PAYLOAD_SECRET: resolvePayloadSecret() };
  if (databaseUrl) {
    env.DATABASE_URL = databaseUrl;
  }
  const r = spawnSync("pnpm", ["exec", "payload", "migrate"], {
    cwd: towerRoot,
    env,
    stdio: "inherit",
  });
  return r.status ?? 1;
}

function main() {
  const { target, useVercel, confirmed } = parseDbScriptArgs(process.argv);

  let databaseUrl;
  try {
    databaseUrl = resolveDatabaseUrl(target, { useVercel, confirmed });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (target !== "local" && !databaseUrl) {
    console.error(`No DATABASE_URL resolved for target "${target}".`);
    process.exit(1);
  }

  console.log(`Payload migrate target: ${target}${databaseUrl ? ` (${describeDatabaseHost(databaseUrl)})` : ""}`);
  process.exit(runPayloadMigrate(databaseUrl));
}

main();
