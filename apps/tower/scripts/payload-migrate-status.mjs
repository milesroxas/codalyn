#!/usr/bin/env node
/**
 * Read-only twin of payload-migrate.mjs: resolve DATABASE_URL for a target and
 * run `payload migrate:status` (no schema changes).
 *
 * Usage (from apps/tower):
 *   node scripts/payload-migrate-status.mjs local|dev|preview|prod [--vercel]
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
  return (process.env.PAYLOAD_SECRET || fileEnv.PAYLOAD_SECRET || "").trim() || "payload-migrate-placeholder";
}

function main() {
  const { target, useVercel } = parseDbScriptArgs(process.argv);

  let databaseUrl;
  try {
    // Status is read-only; skip the prod --confirm rail by passing confirmed.
    databaseUrl = resolveDatabaseUrl(target, { useVercel, confirmed: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (target !== "local" && !databaseUrl) {
    console.error(`No DATABASE_URL resolved for target "${target}".`);
    process.exit(1);
  }

  console.log(
    `Payload migrate:status target: ${target}${databaseUrl ? ` (${describeDatabaseHost(databaseUrl)})` : ""}`
  );
  const env = { ...process.env, PAYLOAD_SECRET: resolvePayloadSecret() };
  if (databaseUrl) {
    env.DATABASE_URL = databaseUrl;
  }
  const r = spawnSync("pnpm", ["exec", "payload", "migrate:status"], {
    cwd: towerRoot,
    env,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

main();
