#!/usr/bin/env node
/**
 * Fills App Review Preflight's "Test the published runtime" form from a published Webflow page.
 *
 * Finds every Beacon hosted-runtime <script> on the page (the `codalyn-beacon-runtime-*.js` asset that
 * `syncCmsSlotPageInlineScript` registers), downloads the exact bytes the page requests, and prints what the
 * form asks for per runtime file: the versioned URL, the lowercase SHA-256 hex of the bytes, the SRI the form
 * will derive from it, and whether the page's own `integrity` attribute already carries that value.
 *
 *   node scripts/webflow-runtime-pin.mjs https://<test-site>.webflow.io/<page-with-beacons>
 *   node scripts/webflow-runtime-pin.mjs <url> --all     # every external <script src> on the page, not only ours
 *
 * Exit 1 when a Beacon runtime is present but its DOM integrity attribute does not match the downloaded bytes
 * (Preflight would report the same mismatch), or when no runtime script is found at all.
 */
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const pageUrl = args.find((a) => !a.startsWith("--"));
const includeAll = args.includes("--all");

if (!pageUrl) {
  console.error("usage: node scripts/webflow-runtime-pin.mjs <published page url> [--all]");
  process.exit(2);
}

const RUNTIME_FILE_RE = /codalyn-beacon-runtime-[0-9a-f]{8}\.js/;
const SCRIPT_TAG_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1] : null;
}

async function fetchOrDie(url, accept) {
  const res = await fetch(url, { headers: { accept }, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return res;
}

const page = await fetchOrDie(pageUrl, "text/html");
const html = await page.text();

const scripts = [];
for (const m of html.matchAll(SCRIPT_TAG_RE)) {
  const src = new URL(m[1], pageUrl).href;
  const ours = RUNTIME_FILE_RE.test(src);
  if (ours || includeAll) {
    scripts.push({ tag: m[0], src, ours, integrity: attr(m[0], "integrity"), crossorigin: attr(m[0], "crossorigin") });
  }
}

if (scripts.length === 0) {
  console.error(
    includeAll
      ? "No <script src> tags found on the page."
      : "No Beacon hosted runtime (codalyn-beacon-runtime-*.js) on this page. Install beacons on the page in the Designer, re-push the runtime, publish, then run again."
  );
  process.exit(1);
}

let mismatches = 0;
let index = 0;
for (const s of scripts) {
  index += 1;
  const res = await fetchOrDie(s.src, "application/javascript,*/*");
  const contentType = res.headers.get("content-type") ?? "";
  const bytes = new Uint8Array(await res.arrayBuffer());
  const sha256Hex = createHash("sha256").update(bytes).digest("hex");
  const sri = `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
  const domMatches = s.integrity == null ? null : s.integrity.trim() === sri;
  if (s.ours && domMatches !== true) {
    mismatches += 1;
  }
  console.log(`Runtime file ${index}${s.ours ? " (Beacon hosted runtime)" : ""}`);
  console.log(`  Versioned runtime URL : ${s.src}`);
  console.log(`  How it loads          : Loaded directly by the published page`);
  console.log(`  SHA-256               : ${sha256Hex}`);
  console.log(`  Script integrity (SRI): ${sri}`);
  console.log(`  Bytes / content-type  : ${bytes.length} / ${contentType}`);
  console.log(
    `  DOM integrity attr    : ${s.integrity ?? "(absent)"}${domMatches === null ? "" : domMatches ? "  ✓ matches" : "  ✗ DOES NOT MATCH"}`
  );
  console.log(`  crossorigin           : ${s.crossorigin ?? "(absent)"}`);
  if (!contentType.includes("javascript")) {
    console.log("  ! content-type is not JavaScript — check the URL is the script request, not an error page");
  }
  console.log("");
}

if (mismatches > 0) {
  console.error(
    `${mismatches} Beacon runtime tag(s) carry an integrity value that is not the SHA-256 SRI of the served bytes. Re-push the runtime from the Designer (CMS Slots → re-sync page custom code) and publish, then run again.`
  );
  process.exit(1);
}
