import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Public documentation for the Beacon Designer Extension, served at /docs. */
export const BEACON_DOCS_META = {
  title: "Beacon Documentation",
  description: "How to install, use, and uninstall Beacon — Codalyn's Webflow Designer Extension.",
  /** ISO date shown in the page header (YYYY-MM-DD). Update when publishing revisions. */
  lastUpdatedDate: "2026-08-07",
  filename: "beacon-guide.md",
} as const;

const DOCS_CONTENT_DIR = join(process.cwd(), "src/features/docs/content");

export async function loadBeaconDocs(): Promise<string> {
  return readFile(join(DOCS_CONTENT_DIR, BEACON_DOCS_META.filename), "utf8");
}
