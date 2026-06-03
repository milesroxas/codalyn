#!/usr/bin/env node
/**
 * Default dev port when `PORT` is unset — keep in sync with Beacon `vite.config.ts` (`resolveTowerOrigin` fallback).
 * Override: `PORT=4000 pnpm app tower dev`
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDevWithWorkspacePackages } from "../../../scripts/workspace-package-watch.mjs";
import { describeDatabaseHost, resolveDatabaseUrl } from "./db-env.mjs";

const towerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.PORT?.trim()) {
  process.env.PORT = "3100";
}

// Optional DB target (default: local DATABASE_URL from .env.local). Non-local targets
// resolve via db-env.mjs (e.g. TOWER_DATABASE_URL_DEV) so no connection string is pasted.
// Next does not override an already-set process.env.DATABASE_URL, so this wins over .env.local.
const dbTarget = process.argv
  .slice(2)
  .find((a) => !a.startsWith("--"))
  ?.toLowerCase();
if (dbTarget === "prod" || dbTarget === "production") {
  console.error("Refusing dev against prod database. Use db:migrate:prod with --confirm for migrations only.");
  process.exit(1);
}
if (dbTarget && dbTarget !== "local") {
  const url = resolveDatabaseUrl(dbTarget, {});
  if (!url) {
    console.error(
      `No DATABASE_URL resolved for target "${dbTarget}". Set TOWER_DATABASE_URL_${dbTarget.toUpperCase()}.`
    );
    process.exit(1);
  }
  process.env.DATABASE_URL = url;
  console.log(`Tower dev using ${dbTarget} database: ${describeDatabaseHost(url)}`);
}

runDevWithWorkspacePackages({
  cwd: towerRoot,
  command: "npx",
  args: ["next", "dev", "--turbopack"],
});
