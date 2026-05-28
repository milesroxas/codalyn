#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Seed local operator accounts from TOWER_PRODUCT_ADMIN_EMAILS.
 * Localhost DATABASE_URL only — invoked by db:reset:local after migrations.
 */
import { generateRandomString, hashPassword } from "better-auth/crypto";
import pg from "pg";
import { assertLocalDatabaseHost, readTowerEnvFiles, resolveDatabaseUrl } from "./db-env.mjs";

const DEFAULT_LOCAL_DEV_PASSWORD = "codalyn-local-dev";

function parseProductAdminEmails() {
  const raw = (readTowerEnvFiles().TOWER_PRODUCT_ADMIN_EMAILS || "").trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function resolveLocalDevPassword() {
  const fromEnv = (process.env.TOWER_LOCAL_DEV_PASSWORD || readTowerEnvFiles().TOWER_LOCAL_DEV_PASSWORD || "").trim();
  return fromEnv || DEFAULT_LOCAL_DEV_PASSWORD;
}

function displayNameFromEmail(email) {
  const local = email.split("@")[0] ?? email;
  const word = local.replace(/[.+_-]/g, " ").trim();
  if (!word) {
    return email;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * @returns {Promise<{ email: string; created: boolean; password: string }[]>}
 */
export async function seedLocalProductAdminUsers(databaseUrl) {
  assertLocalDatabaseHost(databaseUrl);

  const emails = parseProductAdminEmails();
  if (emails.length === 0) {
    return [];
  }

  const password = resolveLocalDevPassword();
  const passwordHash = await hashPassword(password);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const results = [];

  try {
    for (const email of emails) {
      const existing = await client.query(`SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1`, [email]);

      if (existing.rowCount > 0) {
        const userId = existing.rows[0].id;
        await client.query(
          `UPDATE "user"
           SET role = 'product_admin',
               email_verified = true,
               early_access_granted_at = COALESCE(early_access_granted_at, NOW()),
               updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );
        const accountUpdate = await client.query(
          `UPDATE account
           SET password = $1, updated_at = NOW()
           WHERE user_id = $2 AND provider_id = 'credential'`,
          [passwordHash, userId]
        );
        if (accountUpdate.rowCount === 0) {
          const accountRowId = generateRandomString(32);
          await client.query(
            `INSERT INTO account (
               id, account_id, provider_id, user_id, password, created_at, updated_at
             ) VALUES (
               $1, $2, 'credential', $3, $4, NOW(), NOW()
             )`,
            [accountRowId, userId, userId, passwordHash]
          );
        }
        results.push({ email, created: false, password });
        continue;
      }

      const userId = generateRandomString(32);
      const accountId = generateRandomString(32);
      const name = displayNameFromEmail(email);

      await client.query(
        `INSERT INTO "user" (
           id, name, email, role, email_verified, early_access_granted_at,
           subscription_plan, can_create_organization, banned, metering_enabled,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, 'product_admin', true, NOW(),
           'free', false, false, true,
           NOW(), NOW()
         )`,
        [userId, name, email]
      );

      await client.query(
        `INSERT INTO account (
           id, account_id, provider_id, user_id, password, created_at, updated_at
         ) VALUES (
           $1, $2, 'credential', $3, $4, NOW(), NOW()
         )`,
        [accountId, userId, userId, passwordHash]
      );

      results.push({ email, created: true, password });
    }
  } finally {
    await client.end();
  }

  return results;
}

/**
 * @param {string} databaseUrl
 */
export async function runSeedLocalOperators(databaseUrl) {
  const seeded = await seedLocalProductAdminUsers(databaseUrl);
  if (seeded.length === 0) {
    console.log("\nNo TOWER_PRODUCT_ADMIN_EMAILS configured — skipped operator seed.");
    console.log("Set TOWER_PRODUCT_ADMIN_EMAILS in apps/tower/.env to auto-create local operators.");
    return;
  }

  console.log("\nSeeded local operator account(s):");
  for (const row of seeded) {
    const action = row.created ? "created" : "updated";
    console.log(`  • ${row.email} (${action})`);
  }
  console.log(`\nSign in at http://localhost:3100/sign-in`);
  console.log(
    `Password: ${seeded[0]?.password ?? resolveLocalDevPassword()} (all seeded operators share this password)`
  );
  console.log("Operator console: http://localhost:3100/console");
}

async function main() {
  const databaseUrl = resolveDatabaseUrl("local");
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set in apps/tower/.env or .env.local.");
    process.exit(1);
  }

  try {
    await runSeedLocalOperators(databaseUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}
