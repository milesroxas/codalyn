#!/usr/bin/env node
/**
 * Resolve DATABASE_URL and run `drizzle-kit migrate` for Tower.
 *
 * Usage (from repo root: `pnpm app tower db:migrate:<target>`):
 *   node scripts/db-migrate.mjs local              # uses apps/tower/.env + .env.local (no URL in env)
 *   node scripts/db-migrate.mjs dev [--vercel]     # see .env.example
 *   node scripts/db-migrate.mjs prod [--vercel]
 *
 * Secrets stay gitignored: .env.local, optional TOWER_DATABASE_URL_* , NEON_API_KEY, or Vercel pull → .env.migrate.pull (deleted after run).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const towerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pullPath = resolve(towerRoot, ".env.migrate.pull");

function applyEnvLine(line, target) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  target[key] = val;
}

/** Load tower .env files into a plain object (for reading overrides only). */
function readTowerEnvFiles() {
  const out = {};
  for (const name of [".env", ".env.local"]) {
    const p = resolve(towerRoot, name);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    for (const line of src.split("\n")) applyEnvLine(line, out);
  }
  return out;
}

function parseDatabaseUrlFromEnvText(text) {
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.match(/^DATABASE_URL=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) return v;
  }
  return null;
}

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

function neonConnectionString(branch) {
  const fileEnv = readTowerEnvFiles();
  const projectId = (
    process.env.NEON_PROJECT_ID ||
    process.env.TOWER_NEON_PROJECT_ID ||
    fileEnv.NEON_PROJECT_ID ||
    fileEnv.TOWER_NEON_PROJECT_ID ||
    ""
  ).trim();
  const apiKey = (process.env.NEON_API_KEY || fileEnv.NEON_API_KEY || "").trim();

  const args = ["-y", "neonctl@latest", "--no-analytics", "--output", "json", "connection-string", "--pooled"];
  if (projectId) {
    args.push("--project-id", projectId);
  }
  if (apiKey) {
    args.push("--api-key", apiKey);
  }
  if (branch?.trim()) {
    args.push(branch.trim());
  }

  const r = spawnSync("npx", args, {
    encoding: "utf8",
    cwd: towerRoot,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.error) {
    console.error(r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || "neonctl connection-string failed");
    process.exit(r.status ?? 1);
  }
  const out = (r.stdout || "").trim();
  try {
    const j = JSON.parse(out);
    const uri = j.connection_uri ?? j.connectionUri ?? j.uri;
    if (typeof uri === "string" && uri.startsWith("postgresql")) {
      return uri;
    }
  } catch {
    /* fall through */
  }
  const line = out.split("\n").find((l) => l.trim().startsWith("postgresql://"));
  if (line) {
    return line.trim();
  }
  console.error("Could not parse neonctl JSON output. First 300 chars:", out.slice(0, 300));
  process.exit(1);
}

function databaseUrlFromVercel(environment) {
  const r = spawnSync("vercel", ["env", "pull", pullPath, "--environment", environment, "--yes"], {
    cwd: towerRoot,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`vercel env pull failed (${environment}). Is the Tower app linked (apps/tower/.vercel)?`);
    process.exit(r.status ?? 1);
  }
  const text = readFileSync(pullPath, "utf8");
  const url = parseDatabaseUrlFromEnvText(text);
  try {
    unlinkSync(pullPath);
  } catch {
    /* ignore */
  }
  if (!url) {
    console.error(`No DATABASE_URL in Vercel pull for ${environment}.`);
    process.exit(1);
  }
  return url;
}

function databaseUrlForDev(fileEnv, useVercel) {
  const fromFile = (process.env.TOWER_DATABASE_URL_DEV || fileEnv.TOWER_DATABASE_URL_DEV || "").trim();
  if (fromFile) {
    return fromFile;
  }
  if (useVercel) {
    return databaseUrlFromVercel("preview");
  }
  const branch = (process.env.TOWER_NEON_BRANCH_DEV || fileEnv.TOWER_NEON_BRANCH_DEV || "development").trim();
  return neonConnectionString(branch);
}

function databaseUrlForProd(fileEnv, useVercel) {
  const fromFile = (process.env.TOWER_DATABASE_URL_PROD || fileEnv.TOWER_DATABASE_URL_PROD || "").trim();
  if (fromFile) {
    return fromFile;
  }
  if (useVercel) {
    return databaseUrlFromVercel("production");
  }
  const branch = (process.env.TOWER_NEON_BRANCH_PROD || fileEnv.TOWER_NEON_BRANCH_PROD || "").trim();
  return neonConnectionString(branch || undefined);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const useVercel = args.includes("--vercel");
  const positional = args.filter((a) => a !== "--vercel");
  const target = (positional[0] || "local").toLowerCase();
  const fileEnv = readTowerEnvFiles();

  if (target === "local") {
    runDrizzleMigrate(undefined);
    return;
  }
  if (target === "dev") {
    runDrizzleMigrate(databaseUrlForDev(fileEnv, useVercel));
    return;
  }
  if (target === "prod" || target === "production") {
    runDrizzleMigrate(databaseUrlForProd(fileEnv, useVercel));
    return;
  }

  console.error(`Unknown target "${target}". Use: local | dev | prod`);
  process.exit(1);
}

main();
