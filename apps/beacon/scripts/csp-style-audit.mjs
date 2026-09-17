#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
/**
 * Runtime evidence that Beacon's UI renders under the shipped style policy (review round 8, 2026-09-17,
 * "CSP permits inline style attributes … verify rendering under the enforced policy").
 *
 * The shipped extension document enforces `style-src-attr 'none'` and `style-src-elem 'self' <hosted
 * bundle host>` (src/shared/lib/beacon-extension-csp.ts). This script serves the static Storybook catalog —
 * the whole UI surface, rendered without the Webflow Designer runtime — with an *enforced* CSP meta tag
 * injected into the preview document, opens every story in headless Chromium and records every
 * `securitypolicyviolation` event plus every CSP console error. A single violation fails the run.
 *
 * Only the two style directives are enforced here: Storybook's own preview shell needs inline scripts and
 * a websocket-free but inline-styled manager, which the shipped policy never has to allow (the extension
 * document contains none of that; its script/connect posture is pinned by beacon-extension-csp.test.ts).
 *
 *   pnpm --filter beacon storybook:build
 *   node apps/beacon/scripts/csp-style-audit.mjs                # all stories
 *   node apps/beacon/scripts/csp-style-audit.mjs --grep drawer  # subset by story id
 *   node apps/beacon/scripts/csp-style-audit.mjs --settle 800   # ms to wait after each story renders
 *
 * Exit 0 = no violation on any story; 1 = at least one violation (listed per story); 2 = usage/env error.
 */
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const settleMs = Number(flag("--settle", "500"));
const grep = flag("--grep", "");
const verbose = args.includes("--verbose");

const here = path.dirname(fileURLToPath(import.meta.url));
const beaconRoot = path.join(here, "..");
const repoRoot = path.join(beaconRoot, "..", "..");
const staticDir = path.join(beaconRoot, "storybook-static");

if (!existsSync(path.join(staticDir, "index.json")) || !existsSync(path.join(staticDir, "iframe.html"))) {
  console.error("storybook-static is missing or stale — run `pnpm --filter beacon storybook:build` first.");
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = createRequire(path.join(repoRoot, "packages", "loadout", "package.json"))("@playwright/test"));
} catch {
  console.error(
    "Playwright is not installed. Run `pnpm install` (packages/loadout depends on @playwright/test), then `pnpm --filter loadout exec playwright install chromium`."
  );
  process.exit(2);
}

/**
 * Exactly the style posture of the shipped extension document (beacon-extension-csp.ts STYLE_DIRECTIVES),
 * with `'self'` standing in for the Webflow-hosted bundle host because the catalog is served from one origin.
 * `report-uri` is not needed: violations surface as `securitypolicyviolation` events on the document.
 */
const ENFORCED_STYLE_CSP = "style-src 'self'; style-src-elem 'self'; style-src-attr 'none'";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Storybook's preview document injects its own inline `<style>` blocks (sb-preparing-story spinner,
 * addon-themes) — Storybook chrome, not Beacon UI. To keep the enforced elem policy meaningful for the
 * catalog, those inline blocks are moved into one linked stylesheet served from the same origin; the
 * inline `<script>` blocks Storybook needs are left alone (script-src is not part of this audit).
 */
function prepareIframeHtml(html) {
  const inlineStyles = [];
  const stripped = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css) => {
    inlineStyles.push(css);
    return "";
  });
  const meta = `<meta http-equiv="Content-Security-Policy" content="${ENFORCED_STYLE_CSP}">`;
  const link = `<link rel="stylesheet" href="/__storybook-inline-styles.css">`;
  return { html: stripped.replace(/<head([^>]*)>/i, `<head$1>${meta}${link}`), css: inlineStyles.join("\n") };
}

const iframeSource = readFileSync(path.join(staticDir, "iframe.html"), "utf-8");
const prepared = prepareIframeHtml(iframeSource);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/__storybook-inline-styles.css") {
    res.writeHead(200, { "Content-Type": MIME[".css"] });
    res.end(prepared.css);
    return;
  }
  if (url.pathname === "/iframe.html") {
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    res.end(prepared.html);
    return;
  }
  const file = path.join(staticDir, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!file.startsWith(staticDir) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const index = JSON.parse(readFileSync(path.join(staticDir, "index.json"), "utf-8"));
const stories = Object.values(index.entries)
  .filter((entry) => entry.type === "story")
  .filter((entry) => !grep || entry.id.includes(grep));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
await context.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    window.__cspViolations.push({
      directive: event.effectiveDirective,
      blocked: event.blockedURI,
      sample: event.sample,
      source: `${event.sourceFile ?? ""}:${event.lineNumber ?? 0}`,
    });
  });
});
const page = await context.newPage();
const consoleCsp = [];
page.on("console", (message) => {
  const text = message.text();
  if (/Content Security Policy/i.test(text)) {
    consoleCsp.push(text);
  }
});

/**
 * Storybook's preview runtime (`assets/iframe-*.js`: the preview API plus the backgrounds, measure,
 * a11y and test addons) styles its own chrome inline. Those writes are Storybook's, not Beacon's —
 * the shipped extension document has no Storybook in it — so they are tallied separately and never
 * fail the run. Everything else (React DOM's client chunk, story chunks, vendor chunks, Tailwind) is
 * the UI under audit.
 */
const STORYBOOK_RUNTIME_SOURCE = /\/assets\/iframe-[A-Za-z0-9_-]+\.js(?::\d+)?$/;

const failures = [];
const storybookShellViolations = new Map();
let rendered = 0;
for (const story of stories) {
  consoleCsp.length = 0;
  const started = Date.now();
  await page.goto(`${origin}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, {
    waitUntil: "load",
  });
  try {
    await page.waitForSelector("#storybook-root > *, .sb-errordisplay", { state: "attached", timeout: 5_000 });
  } catch {
    /* an empty story root is still a rendered document; violations are collected either way */
  }
  await page.waitForTimeout(settleMs);
  const violations = await page.evaluate(() => window.__cspViolations);
  rendered++;
  const own = [];
  for (const violation of violations) {
    if (STORYBOOK_RUNTIME_SOURCE.test(violation.source)) {
      const key = `${violation.directive} at ${violation.source.replace(/^.*\/assets\//, "assets/")}`;
      storybookShellViolations.set(key, (storybookShellViolations.get(key) ?? 0) + 1);
    } else {
      own.push(violation);
    }
  }
  if (verbose) {
    console.log(
      `${story.id}: ${Date.now() - started}ms, ${violations.length} violation(s), ${own.length} attributed to the UI`
    );
  }
  if (rendered % 25 === 0) {
    console.log(`… ${rendered}/${stories.length} stories`);
  }
  if (own.length > 0) {
    failures.push({ id: story.id, violations: own, console: [...consoleCsp] });
  }
}

await browser.close();
server.close();

console.log(`Enforced policy: ${ENFORCED_STYLE_CSP}`);
console.log(`Stories rendered: ${rendered}${grep ? ` (filter: ${grep})` : ""}`);
if (storybookShellViolations.size > 0) {
  console.log("Storybook preview-runtime inline styles (Storybook chrome, not Beacon UI — informational):");
  for (const [key, count] of storybookShellViolations) {
    console.log(`  ${key} × ${count}`);
  }
}
if (failures.length === 0) {
  console.log("CSP style violations attributed to Beacon UI: 0");
  process.exit(0);
}
console.log(
  `CSP style violations attributed to Beacon UI on ${failures.length} stor${failures.length === 1 ? "y" : "ies"}:`
);
for (const failure of failures) {
  console.log(`- ${failure.id}`);
  for (const violation of failure.violations) {
    console.log(
      `    ${violation.directive} blocked=${violation.blocked} at ${violation.source} sample=${JSON.stringify(violation.sample)}`
    );
  }
  for (const line of failure.console) {
    console.log(`    console: ${line.slice(0, 200)}`);
  }
}
process.exit(1);
