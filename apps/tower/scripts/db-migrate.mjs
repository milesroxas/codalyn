#!/usr/bin/env node
/**
 * Resolve DATABASE_URL and run `drizzle-kit migrate` for Tower.
 *
 * Usage (from repo root: `pnpm app tower db:migrate:<target>`):
 *   node scripts/db-migrate.mjs local              # uses apps/tower/.env + .env.local (no URL in env)
 *   node scripts/db-migrate.mjs dev [--vercel]     # see .env.example
 *   node scripts/db-migrate.mjs prod [--vercel]
 */
import { spawnSync } from "node:child_process";
import { resolveDatabaseUrl, towerRoot } from "./db-env.mjs";

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
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const useVercel = args.includes("--vercel");
  const positional = args.filter((a) => a !== "--vercel");
  const target = (positional[0] || "local").toLowerCase();

  if (target === "local") {
    runDrizzleMigrate(undefined);
    return;
  }

  try {
    runDrizzleMigrate(resolveDatabaseUrl(target, { useVercel }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
