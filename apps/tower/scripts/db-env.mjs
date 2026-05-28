import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const towerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pullPath = resolve(towerRoot, ".env.migrate.pull");

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "postgres"]);
const NEON_BRANCH_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*(@[a-zA-Z0-9.+:-]+)?$/;

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
export function readTowerEnvFiles() {
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

/** @param {string} branch */
export function assertValidNeonBranchName(branch) {
  const trimmed = branch.trim();
  if (!trimmed || !NEON_BRANCH_NAME_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid Neon branch name "${branch}". Use names like "preview", "development", or branch@timestamp.`
    );
  }
  return trimmed;
}

/** @param {string} databaseUrl */
export function parsePostgresDatabaseUrl(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid DATABASE_URL: not a valid URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(`Invalid DATABASE_URL protocol: ${parsed.protocol}`);
  }
  return parsed;
}

/** @param {string} databaseUrl */
export function assertLocalDatabaseHost(databaseUrl) {
  const parsed = parsePostgresDatabaseUrl(databaseUrl);
  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_DB_HOSTS.has(host)) {
    throw new Error(`Refusing local-only operation: DATABASE_URL host "${host}" is not local.`);
  }
  return parsed;
}

/**
 * @param {"local" | "dev" | "preview" | "prod" | "production"} target
 * @param {string} databaseUrl
 */
export function assertSafeRemoteDatabaseUrl(target, databaseUrl) {
  const normalized = target.toLowerCase();
  if (normalized === "local") {
    return parsePostgresDatabaseUrl(databaseUrl);
  }

  const parsed = parsePostgresDatabaseUrl(databaseUrl);
  const host = parsed.hostname.toLowerCase();

  if (LOCAL_DB_HOSTS.has(host)) {
    throw new Error(`Refusing ${normalized} target: DATABASE_URL host "${host}" looks local.`);
  }

  if (normalized === "prod" || normalized === "production") {
    const allowNonNeon = process.env.TOWER_DB_ALLOW_NON_NEON === "1";
    if (!allowNonNeon && !host.endsWith(".neon.tech")) {
      throw new Error(
        `Refusing prod target: host "${host}" is not a Neon host. Set TOWER_DB_ALLOW_NON_NEON=1 to override.`
      );
    }
  }

  return parsed;
}

/** @param {string} databaseUrl */
export function describeDatabaseHost(databaseUrl) {
  return parsePostgresDatabaseUrl(databaseUrl).hostname;
}

/**
 * @param {"local" | "dev" | "preview" | "prod" | "production"} target
 * @param {string} databaseUrl
 * @param {{ confirmed?: boolean }} opts
 */
export function requireProdMigrationConfirm(target, databaseUrl, opts = {}) {
  const normalized = target.toLowerCase();
  if (normalized !== "prod" && normalized !== "production") {
    return;
  }
  if (opts.confirmed || process.env.TOWER_DB_MIGRATE_CONFIRM === "1") {
    return;
  }

  const host = describeDatabaseHost(databaseUrl);
  throw new Error(
    `Refusing prod migration to ${host} without --confirm. Re-run with --confirm or set TOWER_DB_MIGRATE_CONFIRM=1 for CI.`
  );
}

/**
 * @param {string[]} argv
 * @returns {{ target: string; useVercel: boolean; confirmed: boolean; dryRun: boolean }}
 */
export function parseDbScriptArgs(argv) {
  const args = argv.slice(2).filter((a) => a !== "--");
  return {
    target: (args.find((a) => !a.startsWith("--")) || "local").toLowerCase(),
    useVercel: args.includes("--vercel"),
    confirmed: args.includes("--confirm"),
    dryRun: args.includes("--dry-run"),
  };
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
  if (branch?.trim()) {
    args.push(assertValidNeonBranchName(branch));
  }

  const spawnEnv = { ...process.env };
  if (apiKey) {
    spawnEnv.NEON_API_KEY = apiKey;
  }

  const r = spawnSync("npx", args, {
    encoding: "utf8",
    cwd: towerRoot,
    env: spawnEnv,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.error) {
    throw new Error(r.error.message);
  }
  if (r.status !== 0) {
    throw new Error(
      "neonctl connection-string failed. Verify NEON_PROJECT_ID, NEON_API_KEY (or neonctl auth), and branch name."
    );
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
  throw new Error("Could not parse neonctl connection-string output. Verify branch name and Neon credentials.");
}

function databaseUrlFromVercel(environment) {
  const r = spawnSync("vercel", ["env", "pull", pullPath, "--environment", environment, "--yes"], {
    cwd: towerRoot,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(`vercel env pull failed (${environment}). Is the Tower app linked (apps/tower/.vercel)?`);
  }
  const text = readFileSync(pullPath, "utf8");
  const url = parseDatabaseUrlFromEnvText(text);
  try {
    unlinkSync(pullPath);
  } catch {
    /* ignore */
  }
  if (!url) {
    throw new Error(`No DATABASE_URL in Vercel pull for ${environment}.`);
  }
  return url;
}

function databaseUrlForDev(fileEnv, useVercel) {
  if (useVercel) {
    return databaseUrlFromVercel("preview");
  }
  const fromFile = (process.env.TOWER_DATABASE_URL_DEV || fileEnv.TOWER_DATABASE_URL_DEV || "").trim();
  if (fromFile) {
    return fromFile;
  }
  const branch = (process.env.TOWER_NEON_BRANCH_DEV || fileEnv.TOWER_NEON_BRANCH_DEV || "development").trim();
  return neonConnectionString(branch);
}

function databaseUrlForPreview(fileEnv, useVercel) {
  if (useVercel) {
    return databaseUrlFromVercel("preview");
  }
  const fromFile = (process.env.TOWER_DATABASE_URL_PREVIEW || fileEnv.TOWER_DATABASE_URL_PREVIEW || "").trim();
  if (fromFile) {
    return fromFile;
  }
  const branch = (process.env.TOWER_NEON_BRANCH_PREVIEW || fileEnv.TOWER_NEON_BRANCH_PREVIEW || "preview").trim();
  return neonConnectionString(branch);
}

function databaseUrlForProd(fileEnv, useVercel) {
  if (useVercel) {
    return databaseUrlFromVercel("production");
  }
  const fromFile = (process.env.TOWER_DATABASE_URL_PROD || fileEnv.TOWER_DATABASE_URL_PROD || "").trim();
  if (fromFile) {
    return fromFile;
  }
  const branch = (process.env.TOWER_NEON_BRANCH_PROD || fileEnv.TOWER_NEON_BRANCH_PROD || "").trim();
  return neonConnectionString(branch || undefined);
}

/**
 * @param {"local" | "dev" | "preview" | "prod" | "production"} target
 * @param {{ useVercel?: boolean; confirmed?: boolean }} opts
 * @returns {string | undefined} undefined for local (uses shell / .env DATABASE_URL)
 */
export function resolveDatabaseUrl(target, opts = {}) {
  const useVercel = Boolean(opts.useVercel);
  const normalized = target.toLowerCase();
  if (normalized === "local") {
    const fileEnv = readTowerEnvFiles();
    return (process.env.DATABASE_URL || fileEnv.DATABASE_URL || "").trim() || undefined;
  }
  const fileEnv = readTowerEnvFiles();
  let databaseUrl;
  if (normalized === "dev") {
    databaseUrl = databaseUrlForDev(fileEnv, useVercel);
  } else if (normalized === "preview") {
    databaseUrl = databaseUrlForPreview(fileEnv, useVercel);
  } else if (normalized === "prod" || normalized === "production") {
    databaseUrl = databaseUrlForProd(fileEnv, useVercel);
  } else {
    throw new Error(`Unknown target "${target}". Use: local | dev | preview | prod`);
  }

  assertSafeRemoteDatabaseUrl(normalized, databaseUrl);
  requireProdMigrationConfirm(normalized, databaseUrl, { confirmed: opts.confirmed });
  return databaseUrl;
}
