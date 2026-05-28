#!/usr/bin/env node
/**
 * Validate Tower Drizzle migration journal integrity.
 *
 * Usage (from repo root):
 *   pnpm app tower db:check
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { towerRoot } from "./db-env.mjs";

const drizzleDir = join(towerRoot, "drizzle");
const journalPath = join(drizzleDir, "meta", "_journal.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJournal() {
  if (!existsSync(journalPath)) {
    fail(`Missing Drizzle journal: ${journalPath}`);
  }
  return JSON.parse(readFileSync(journalPath, "utf8"));
}

function listSqlTags() {
  return readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.slice(0, -".sql".length))
    .sort();
}

function listSnapshotIndices() {
  return readdirSync(join(drizzleDir, "meta"))
    .filter((name) => name.endsWith("_snapshot.json"))
    .map((name) => Number.parseInt(name.slice(0, 4), 10))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);
}

function hashMigration(tag) {
  const sql = readFileSync(join(drizzleDir, `${tag}.sql`), "utf8");
  return createHash("sha256").update(sql).digest("hex");
}

function validateJournalStructure(journal) {
  const issues = [];
  const { entries } = journal;

  if (!Array.isArray(entries) || entries.length === 0) {
    issues.push("Journal has no entries.");
    return issues;
  }

  const tags = entries.map((entry) => entry.tag);

  for (const tag of listSqlTags()) {
    if (!tags.includes(tag)) {
      issues.push(`SQL file missing from journal: ${tag}.sql`);
    }
  }

  for (const entry of entries) {
    if (!existsSync(join(drizzleDir, `${entry.tag}.sql`))) {
      issues.push(`Journal entry missing SQL file: ${entry.tag}.sql`);
    }
  }

  entries.forEach((entry, index) => {
    if (entry.idx !== index) {
      issues.push(`Entry idx mismatch at ${index}: expected ${index}, got ${entry.idx} (${entry.tag}).`);
    }

    const expectedPrefix = String(index).padStart(4, "0");
    if (!entry.tag.startsWith(`${expectedPrefix}_`)) {
      issues.push(`Entry tag prefix mismatch at idx ${index}: ${entry.tag}.`);
    }

    if (entry.version !== journal.version) {
      issues.push(`Entry version mismatch at idx ${index}: ${entry.tag}.`);
    }

    if (entry.breakpoints !== true) {
      issues.push(`Entry breakpoints must be true at idx ${index}: ${entry.tag}.`);
    }
  });

  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index].when <= entries[index - 1].when) {
      issues.push(
        `Entry "when" must increase: ${entries[index - 1].tag} (${entries[index - 1].when}) -> ${entries[index].tag} (${entries[index].when}).`
      );
    }
  }

  return issues;
}

function validateLatestSnapshot(entries) {
  const issues = [];
  const latestIdx = entries.length - 1;
  const latestSnapshotPath = join(drizzleDir, "meta", `${String(latestIdx).padStart(4, "0")}_snapshot.json`);

  if (!existsSync(latestSnapshotPath)) {
    issues.push(
      `Missing latest snapshot ${latestSnapshotPath}. Run \`pnpm app tower db:generate\` after schema changes.`
    );
    return issues;
  }

  const snapshotIndices = listSnapshotIndices();
  if (snapshotIndices.length === 0) {
    issues.push("No snapshot files found in drizzle/meta.");
    return issues;
  }

  if (snapshotIndices[snapshotIndices.length - 1] !== latestIdx) {
    issues.push(
      `Latest snapshot idx ${snapshotIndices[snapshotIndices.length - 1]} does not match latest journal idx ${latestIdx}.`
    );
  }

  return issues;
}

function runDrizzleKitCheck() {
  const result = spawnSync("pnpm", ["exec", "drizzle-kit", "check"], {
    cwd: towerRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const journal = readJournal();
  const issues = [...validateJournalStructure(journal), ...validateLatestSnapshot(journal.entries)];

  if (issues.length > 0) {
    console.error("Drizzle journal validation failed:");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  const tags = journal.entries.map((entry) => entry.tag);
  console.log(`Drizzle journal OK (${tags.length} migrations).`);
  console.log(`Latest migration: ${tags[tags.length - 1]}`);
  console.log(`Latest snapshot: ${String(tags.length - 1).padStart(4, "0")}_snapshot.json`);

  for (const entry of journal.entries) {
    hashMigration(entry.tag);
  }

  runDrizzleKitCheck();
}

main();
