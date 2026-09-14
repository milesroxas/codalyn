#!/usr/bin/env node
/**
 * Local stand-in for App Review Preflight's "Test the published runtime" browser observation.
 *
 * Opens a published Webflow page in headless Chromium and records every JavaScript the page executes —
 * the tags in the served HTML, script elements created after the page started running, and scripts fetched
 * without an element (module imports) — with the SHA-256 / SRI of the exact bytes each one served and, via
 * the DevTools protocol, which script (or the HTML parser) requested it. That is what Preflight's findings
 * "Unreviewed scripts loaded" and "New script elements were created" are built from, and the initiator column
 * is the evidence that Beacon's hosted runtime loads nothing.
 *
 *   node scripts/webflow-runtime-observe.mjs https://<test-site>.webflow.io/<page-with-beacons>
 *   node scripts/webflow-runtime-observe.mjs <url> --settle 6000       # wait longer after network idle (ms)
 *   node scripts/webflow-runtime-observe.mjs <url> --ready '<css>'     # override the readiness selector
 *
 * Exit 1 when a Beacon runtime tag is missing, carries no `integrity`, or its `integrity` is not the SHA-256
 * SRI of the served bytes; exit 2 on usage / environment errors. Needs the Playwright that packages/loadout
 * depends on (`pnpm install`, then `pnpm --filter loadout exec playwright install chromium` once).
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const pageUrl = args.find((a) => !a.startsWith("--"));
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const settleMs = Number(flag("--settle", "4000"));
const readySelector = flag("--ready", '[data-beacon-target="list"][data-cb-rendered="1"]');

if (!pageUrl) {
  console.error(
    "usage: node scripts/webflow-runtime-observe.mjs <published page url> [--settle ms] [--ready selector]"
  );
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try {
  ({ chromium } = createRequire(path.join(here, "..", "packages", "loadout", "package.json"))("@playwright/test"));
} catch {
  console.error(
    "Playwright is not installed. Run `pnpm install` (packages/loadout depends on @playwright/test), then `pnpm --filter loadout exec playwright install chromium`."
  );
  process.exit(2);
}

const RUNTIME_FILE_RE = /codalyn-beacon-runtime-[0-9a-f]{8}\.js/;
const SCRIPT_TAG_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Webflow's own published-site runtime, by URL shape. Rendered by Webflow on every published page. */
function classify(url) {
  if (RUNTIME_FILE_RE.test(url)) return "beacon";
  let u;
  try {
    u = new URL(url);
  } catch {
    return "other";
  }
  const p = u.pathname;
  if (u.hostname === "cdn.prod.website-files.com" || u.hostname.endsWith(".website-files.com")) {
    if (/\/js\/webflow\.[0-9a-f]+\.[0-9a-f]+\.js$/.test(p)) return "webflow-platform";
    if (/\/js\/webflow\.(achunk|schunk)\.[0-9a-f]+\.js$/.test(p)) return "webflow-platform";
    if (/^\/gsap\//.test(p)) return "webflow-platform";
  }
  if (u.hostname === "d3e54v103j8qbb.cloudfront.net" && /\/js\/jquery-/.test(p)) return "webflow-platform";
  if (u.hostname === "ajax.googleapis.com" && /\/webfont\//.test(p)) return "webflow-platform";
  return "other";
}

function describeInitiator(init) {
  if (!init) return "unknown";
  if (init.type === "parser") return `parser (${init.url ?? "document"})`;
  if (init.type === "script") {
    const frames = init.stack?.callFrames ?? [];
    const frame = frames.find((f) => f.url) ?? null;
    return frame ? `script (${frame.url})` : "script (anonymous)";
  }
  return init.type ?? "unknown";
}

function sha(bytes) {
  return {
    hex: createHash("sha256").update(bytes).digest("hex"),
    sri: `sha256-${createHash("sha256").update(bytes).digest("base64")}`,
  };
}

const loaded = new Map(); // url -> { status, contentType, bytes, hex, sri }
const initiators = new Map(); // url -> description

const browser = await chromium.launch({ headless: true });
let exitCode = 0;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (e) => {
    if (e.type === "Script" && !initiators.has(e.request.url)) {
      initiators.set(e.request.url, describeInitiator(e.initiator));
    }
  });
  page.on("response", async (res) => {
    if (res.request().resourceType() !== "script") return;
    try {
      const bytes = await res.body();
      loaded.set(res.url(), {
        status: res.status(),
        contentType: res.headers()["content-type"] ?? "",
        bytes: bytes.length,
        ...sha(bytes),
      });
    } catch {
      loaded.set(res.url(), { status: res.status(), contentType: "", bytes: -1, hex: "(body unavailable)", sri: "" });
    }
  });

  const nav = await page.goto(pageUrl, { waitUntil: "load", timeout: 60_000 });
  if (!nav?.ok()) {
    console.error(`${pageUrl} → HTTP ${nav ? nav.status() : "no response"}`);
    process.exit(2);
  }
  const html = await nav.text();
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(settleMs);
  const ready = await page
    .waitForSelector(readySelector, { timeout: 10_000, state: "attached" })
    .then(() => true)
    .catch(() => false);
  const readyCount = await page.$$eval(readySelector, (els) => els.length).catch(() => 0);

  const staticSrcs = new Set();
  for (const m of html.matchAll(SCRIPT_TAG_RE)) staticSrcs.add(new URL(m[1], pageUrl).href);

  const domScripts = await page.$$eval("script[src]", (els) =>
    els.map((s) => ({
      src: s.src,
      integrity: s.getAttribute("integrity"),
      crossorigin: s.getAttribute("crossorigin"),
      type: s.getAttribute("type") ?? "",
    }))
  );

  const rows = [];
  const seen = new Set();
  for (const s of domScripts) {
    seen.add(s.src);
    rows.push({ url: s.src, element: staticSrcs.has(s.src) ? "in served HTML" : "created after page start", ...s });
  }
  for (const url of loaded.keys()) {
    if (!seen.has(url))
      rows.push({ url, element: "no element (module import / worker)", integrity: null, crossorigin: null });
  }
  for (const r of rows) {
    r.kind = classify(r.url);
    r.initiator = initiators.get(r.url) ?? "unknown";
    r.net = loaded.get(r.url) ?? null;
  }

  const order = { beacon: 0, "webflow-platform": 1, other: 2 };
  rows.sort((a, b) => order[a.kind] - order[b.kind] || a.url.localeCompare(b.url));

  console.log(`Page: ${pageUrl}`);
  console.log(`Ready selector ${readySelector}: ${ready ? `present (${readyCount})` : "NOT FOUND"}`);
  console.log(`Scripts observed: ${rows.length}\n`);

  let beaconCount = 0;
  for (const r of rows) {
    const label = {
      beacon: "BEACON HOSTED RUNTIME",
      "webflow-platform": "Webflow platform",
      other: "OTHER (not Webflow, not Beacon)",
    }[r.kind];
    console.log(`[${label}] ${r.url}`);
    console.log(`  element     : ${r.element}${r.type ? ` (type=${r.type})` : ""}`);
    console.log(`  requested by: ${r.initiator}`);
    if (r.net) {
      console.log(`  served      : HTTP ${r.net.status}, ${r.net.bytes} bytes, ${r.net.contentType}`);
      console.log(`  SHA-256     : ${r.net.hex}`);
      console.log(`  SRI         : ${r.net.sri}`);
    } else {
      console.log("  served      : (no response captured — cached or blocked)");
    }
    if (r.kind === "beacon") {
      beaconCount += 1;
      const match = r.net && r.integrity != null ? r.integrity.trim() === r.net.sri : null;
      console.log(
        `  integrity   : ${r.integrity ?? "(absent)"}${match === null ? "" : match ? "  ✓ matches served bytes" : "  ✗ DOES NOT MATCH served bytes"}`
      );
      console.log(`  crossorigin : ${r.crossorigin ?? "(absent)"}`);
      if (r.integrity == null) {
        exitCode = 1;
        console.log("  ! no integrity attribute in the DOM — the page is not carrying the registered SRI pin");
      } else if (match !== true) {
        exitCode = 1;
        console.log("  ! integrity does not match — re-push the runtime (CMS Slots → Sync), publish, run again");
      }
    }
    console.log("");
  }
  if (beaconCount === 0) {
    exitCode = 1;
    console.error("No Beacon hosted runtime (codalyn-beacon-runtime-*.js) on this page.");
  }

  const fromBeacon = rows.filter((r) => RUNTIME_FILE_RE.test(r.initiator));
  console.log(`Scripts requested by the Beacon runtime: ${fromBeacon.length}`);
  const others = rows.filter((r) => r.kind === "other");
  console.log(
    `Scripts that are neither Webflow platform nor Beacon: ${others.length}${others.length ? " — remove them from the test page or pin them in the test package" : ""}`
  );
  const dynamic = rows.filter((r) => r.element !== "in served HTML");
  console.log(`Scripts not in the served HTML (dynamic): ${dynamic.length}`);

  console.log("\nTest-package rows (every script the page executed):");
  console.log("  Versioned runtime URL | How it loads | SHA-256");
  for (const r of rows) {
    const parent = r.initiator.match(/\(([^)]+)\)/)?.[1];
    const how =
      r.element === "in served HTML"
        ? "Loaded directly by the published page"
        : `Added at runtime by ${parent ? parent.split("/").pop() : r.initiator}`;
    console.log(`  ${r.url} | ${how} | ${r.net?.hex ?? "?"}`);
  }
} finally {
  await browser.close();
}
process.exit(exitCode);
