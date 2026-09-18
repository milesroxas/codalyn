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
 *   node scripts/webflow-runtime-pin.mjs <url> --expect-url=<saved url> --expect-sri=<saved sri>
 *
 * `--expect-*` compares the page against the values already saved in App Review Preflight's runtime test
 * package. A package saved before a re-Sync holds a superseded URL or SRI, and the tool then reports
 * "Script integrity is missing or wrong" against a page tag that is itself correct (R8.16) — this check
 * separates that case from a real defect before the run.
 *
 * Also checks what Preflight's "Runtime is not traceable to source" looks at: the runtime's last line must point at a
 * reachable version-3 source map whose sourcesContent is the served file minus that line (R8.13), and reports
 * whether the served bytes end with a newline (a consumer that trims the body before hashing would then hash
 * different bytes than the SRI covers).
 *
 * Exit 1 when a Beacon runtime is present but its DOM integrity attribute does not match the downloaded bytes
 * (Preflight would report the same mismatch), when its source map is missing or unreachable, or when no runtime
 * script is found at all.
 */
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const pageUrl = args.find((a) => !a.startsWith("--"));
const includeAll = args.includes("--all");

/** Value of `--name=value`, or null when the flag is absent. */
function flagValue(name) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit == null ? null : hit.slice(name.length + 3).trim();
}

const expectUrl = flagValue("expect-url");
const expectSri = flagValue("expect-sri");
const expectSha256 = flagValue("expect-sha256");

if (!pageUrl) {
  console.error(
    "usage: node scripts/webflow-runtime-pin.mjs <published page url> [--all] [--expect-url=…] [--expect-sha256=…] [--expect-sri=…]"
  );
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
let mapProblems = 0;
let staleExpectations = 0;
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
  if (s.ours) {
    for (const [label, expected, actual] of [
      ["saved URL", expectUrl, s.src],
      ["saved SHA-256", expectSha256, sha256Hex],
      ["saved SRI", expectSri, sri],
    ]) {
      if (expected == null || expected.length === 0) {
        continue;
      }
      const same = expected === actual;
      if (!same) {
        staleExpectations += 1;
      }
      console.log(
        `  ${label.padEnd(21)} : ${expected}${same ? "  \u2713 matches the page" : "  \u2717 SUPERSEDED \u2014 the page serves the value above"}`
      );
    }
  }
  if (!contentType.includes("javascript")) {
    console.log("  ! content-type is not JavaScript — check the URL is the script request, not an error page");
  }
  const endsWithNewline = bytes.length > 0 && bytes[bytes.length - 1] === 0x0a;
  console.log(
    `  trailing newline      : ${endsWithNewline ? "yes  ! a body-trimming consumer would hash different bytes" : "no"}`
  );
  const text = new TextDecoder().decode(bytes);
  const lastBreak = text.lastIndexOf("\n");
  const trailer = /^\/\/# sourceMappingURL=(\S+)$/.exec(text.slice(lastBreak + 1));
  if (!trailer) {
    console.log(
      "  source map            : (no sourceMappingURL trailer)  ✗ Preflight: runtime not traceable to source"
    );
    if (s.ours) {
      mapProblems += 1;
    }
  } else {
    const mapUrl = new URL(trailer[1], s.src).href;
    try {
      const mapRes = await fetchOrDie(mapUrl, "application/json,*/*");
      const mapBytes = new Uint8Array(await mapRes.arrayBuffer());
      const map = JSON.parse(new TextDecoder().decode(mapBytes));
      const body = text.slice(0, lastBreak);
      const sourceMatches = Array.isArray(map.sourcesContent) && map.sourcesContent[0] === body;
      const ok = map.version === 3 && Array.isArray(map.sources) && typeof map.mappings === "string" && sourceMatches;
      console.log(`  source map            : ${mapUrl}`);
      console.log(
        `  source map check      : version ${map.version}, ${mapBytes.length} bytes, sha256 ${createHash("sha256").update(mapBytes).digest("hex")}` +
          `${ok ? "  ✓ v3, sourcesContent == served file minus its last line" : "  ✗ DOES NOT MATCH the served file"}`
      );
      if (!ok && s.ours) {
        mapProblems += 1;
      }
    } catch (err) {
      console.log(
        `  source map            : ${mapUrl}  ✗ unreachable (${err instanceof Error ? err.message : String(err)})`
      );
      if (s.ours) {
        mapProblems += 1;
      }
    }
  }
  console.log("");
}

if (mapProblems > 0) {
  console.error(
    `${mapProblems} Beacon runtime(s) have no reachable identity source map behind their sourceMappingURL trailer. Preflight reports this as "Runtime is not traceable to source". Re-push the runtime from the Designer (CMS Slots → Sync) and check the extension console for a "runtime source map upload failed" warning — Webflow refusing the .map.json asset is the likely cause.`
  );
}

if (mismatches > 0) {
  console.error(
    `${mismatches} Beacon runtime tag(s) do not carry the SHA-256 SRI of the served bytes in their integrity attribute (absent, or a different value). Re-push the runtime from the Designer (CMS Slots → the page runtime Sync button), publish, then run again. If the attribute is still absent after a fresh push, Webflow is not rendering the registered integrityHash on this page — record that as a platform observation, not an app defect.`
  );
  process.exit(1);
}

if (staleExpectations > 0) {
  console.error(
    `${staleExpectations} value(s) saved in the Preflight test package no longer describe this page. Re-fill the runtime file rows from the output above and save the test setup again; a stale package reports "Script integrity is missing or wrong" against a correct page tag (R8.16).`
  );
  process.exit(1);
}

if (mapProblems > 0) {
  process.exit(1);
}
