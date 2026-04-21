import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const towerDir = dirname(fileURLToPath(import.meta.url));

function applyEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

/** Same layering as Next.js: `.env` then `.env.local` (later overrides). */
function loadTowerEnvFiles() {
  for (const name of [".env", ".env.local"] as const) {
    const path = resolve(towerDir, name);
    if (!existsSync(path)) continue;
    const src = readFileSync(path, "utf8");
    for (const line of src.split("\n")) applyEnvLine(line);
  }
}

// Prefer an explicit DATABASE_URL (CI, `vercel env pull` + migrate, Neon CLI) over repo `.env` files.
if (!process.env.DATABASE_URL?.trim()) {
  loadTowerEnvFiles();
}

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Set it in apps/tower/.env or apps/tower/.env.local before running drizzle-kit."
  );
}

export default defineConfig({
  schema: "./src/shared/lib/db/auth-schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
