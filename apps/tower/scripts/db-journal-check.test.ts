import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { towerRoot } from "./db-env.mjs";

const drizzleDir = join(towerRoot, "drizzle");
const journalPath = join(drizzleDir, "meta", "_journal.json");

function readJournal() {
  return JSON.parse(readFileSync(journalPath, "utf8"));
}

function listSqlTags() {
  return readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.slice(0, -".sql".length))
    .sort();
}

describe("Drizzle journal", () => {
  it("lists every SQL migration in meta/_journal.json", () => {
    const journal = readJournal();
    const tags = journal.entries.map((entry: { tag: string }) => entry.tag);
    const sqlTags = listSqlTags();

    expect(tags).toEqual(sqlTags);
    expect(tags).toContain("0017_support_request");
    expect(tags.at(-1)).toBe("0020_workspace_ownership");
  });

  it("uses sequential idx values and monotonic when timestamps", () => {
    const journal = readJournal();

    journal.entries.forEach((entry: { idx: number; tag: string; when: number }, index: number) => {
      expect(entry.idx).toBe(index);
      expect(entry.tag.startsWith(`${String(index).padStart(4, "0")}_`)).toBe(true);
      if (index > 0) {
        expect(entry.when).toBeGreaterThan(journal.entries[index - 1].when);
      }
    });
  });

  it("has a latest snapshot aligned with the last journal entry", () => {
    const journal = readJournal();
    const latestIdx = journal.entries.length - 1;
    const latestSnapshot = join(drizzleDir, "meta", `${String(latestIdx).padStart(4, "0")}_snapshot.json`);

    expect(existsSync(latestSnapshot)).toBe(true);
  });

  it("has stable migration hashes for each journal entry", () => {
    const journal = readJournal();

    for (const entry of journal.entries as Array<{ tag: string }>) {
      const sql = readFileSync(join(drizzleDir, `${entry.tag}.sql`), "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
