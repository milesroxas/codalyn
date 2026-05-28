#!/usr/bin/env node
/**
 * Wipe the local Docker Postgres volume and re-apply Drizzle migrations.
 *
 * Usage (from repo root):
 *   pnpm app tower db:reset:local -- --confirm
 *
 * Safety:
 * - Requires `--confirm`
 * - Refuses when `DATABASE_URL` (from `.env` / `.env.local`) is not localhost
 *
 * After reset, operator accounts in TOWER_PRODUCT_ADMIN_EMAILS are seeded automatically
 * (password: TOWER_LOCAL_DEV_PASSWORD or "codalyn-local-dev").
 */
import { spawnSync } from "node:child_process";
import {
  assertLocalDatabaseHost,
  describeDatabaseHost,
  readTowerEnvFiles,
  resolveDatabaseUrl,
  towerRoot,
} from "./db-env.mjs";
import { runSeedLocalOperators } from "./db-seed-local-operators.mjs";

const POSTGRES_READY_ATTEMPTS = 30;
const POSTGRES_READY_DELAY_MS = 1000;

function parseArgs(argv) {
  const args = argv.slice(2).filter((a) => a !== "--");
  return {
    confirmed: args.includes("--confirm"),
  };
}

function run(command, args) {
  const r = spawnSync(command, args, {
    cwd: towerRoot,
    stdio: "inherit",
  });
  if (r.error) {
    throw new Error(r.error.message);
  }
  if (r.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPostgres() {
  for (let attempt = 1; attempt <= POSTGRES_READY_ATTEMPTS; attempt += 1) {
    const r = spawnSync("docker", ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "tower", "-d", "tower"], {
      cwd: towerRoot,
      stdio: "ignore",
    });
    if (r.status === 0) {
      return;
    }
    if (attempt < POSTGRES_READY_ATTEMPTS) {
      sleep(POSTGRES_READY_DELAY_MS);
    }
  }
  throw new Error("Postgres did not become ready in time. Check `docker compose logs postgres`.");
}

function printOperatorNextSteps() {
  const emails = (readTowerEnvFiles().TOWER_PRODUCT_ADMIN_EMAILS || "").trim();
  if (!emails) {
    console.log("\nTip: set TOWER_PRODUCT_ADMIN_EMAILS in apps/tower/.env to auto-seed operators on reset.");
  }
}

async function main() {
  const { confirmed } = parseArgs(process.argv);
  if (!confirmed) {
    console.error("Refusing local database reset without --confirm.");
    console.error("Usage: pnpm app tower db:reset:local -- --confirm");
    process.exit(1);
  }

  let databaseUrl;
  try {
    databaseUrl = resolveDatabaseUrl("local");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in apps/tower/.env or .env.local.");
    process.exit(1);
  }

  try {
    assertLocalDatabaseHost(databaseUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log(`Resetting local Tower database at ${describeDatabaseHost(databaseUrl)} (Docker volume wipe + migrate)…`);

  try {
    run("docker", ["compose", "down", "-v"]);
    run("docker", ["compose", "up", "-d", "postgres"]);
    waitForPostgres();
    run("node", ["scripts/db-migrate.mjs", "local"]);
    await runSeedLocalOperators(databaseUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  printOperatorNextSteps();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
