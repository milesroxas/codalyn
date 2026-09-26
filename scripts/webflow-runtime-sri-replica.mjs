#!/usr/bin/env node
/**
 * Local replica of App Review Preflight's "Script integrity" predicate, run against a published page.
 *
 * The tool's runner (createsomethingtoday/webflow-app-preflight, `runner/src/index.ts`, production origin
 * `webflow-app-review-preflight.webflow-inc.workers.dev`) sets a pinned file's `domIntegrity` from ONE DOM
 * snapshot: the one it takes through CDP (`DOM.getDocument` + `DOM.querySelectorAll('script[src]')`) inside
 * the route handler of the file's FIRST network request. If no `<script>` element with that exact `src` exists
 * at that instant, `domIntegrity` is null and the run reports "Script integrity is missing or wrong" — the
 * tag's actual attributes are never read. Chromium's preload scanner requests every `<script src>` that
 * follows a synchronous script before the parser inserts those elements, so on a published Webflow page
 * (jQuery and webflow.js precede footer custom code) the pinned runtime is requested while the DOM holds no
 * script element at all. This script reproduces that observation so the outcome can be predicted without
 * spending a Preflight run, and prints the request-time state for every script on the page (R8.24).
 *
 *   node scripts/webflow-runtime-sri-replica.mjs <published page url>
 *   node scripts/webflow-runtime-sri-replica.mjs <url> --ready '<css selector>' --runs 3 --pin <runtime url>
 *
 * Defaults: ready selector `[data-beacon-target="list"][data-cb-rendered="1"]`, 3 runs, pin = the first
 * `codalyn-beacon-runtime-*.js` tag on the page. Exit 0 when the pinned element was present at request time in
 * every run (the tool's predicate can pass), exit 1 when it was absent in any run (the tool reports the item
 * regardless of the tag), exit 2 on usage or environment errors. Needs the Playwright that packages/loadout
 * depends on (`pnpm install`, then `pnpm --filter loadout exec playwright install chromium` once).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const FLAGS_WITH_VALUES = ["--ready", "--runs", "--pin"];
const args = process.argv.slice(2);
const pageUrl = args.find((a, i) => !a.startsWith("--") && !(i > 0 && FLAGS_WITH_VALUES.includes(args[i - 1])));
function flag(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 || index + 1 >= args.length ? fallback : args[index + 1];
}
const readySelector = flag("--ready", '[data-beacon-target="list"][data-cb-rendered="1"]');
const runs = Number.parseInt(flag("--runs", "3"), 10);
const pinFlag = flag("--pin", null);

if (!pageUrl || !Number.isInteger(runs) || runs < 1) {
  console.error(
    "usage: node scripts/webflow-runtime-sri-replica.mjs <published page url> [--ready <selector>] [--runs <n>] [--pin <runtime url>]"
  );
  process.exit(2);
}

const RUNTIME_FILE_RE = /codalyn-beacon-runtime-[0-9a-f]{8}\.js/;

/** Same shape as the runner's `attributesRecord`: CDP returns a flat [name, value, name, value] list. */
function attributesRecord(attributes) {
  const result = {};
  for (let index = 0; index < attributes.length; index += 2) {
    const name = attributes[index];
    const value = attributes[index + 1];
    if (name && value !== undefined) result[name.toLowerCase()] = value;
  }
  return result;
}

/** Verbatim port of the runner's `captureTrustedScripts`: the DOM as CDP sees it right now. */
async function captureTrustedScripts(cdp, documentUrl) {
  await cdp.send("DOM.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "script[src]" });
  const scripts = [];
  for (const nodeId of nodeIds.slice(0, 200)) {
    const { attributes } = await cdp.send("DOM.getAttributes", { nodeId });
    const values = attributesRecord(attributes);
    if (!values.src) continue;
    let src = "[invalid-url]";
    try {
      src = new URL(values.src, documentUrl).toString();
    } catch {
      src = "[invalid-url]";
    }
    scripts.push({ src, integrity: values.integrity ?? null, crossOrigin: values.crossorigin ?? null });
  }
  return scripts;
}

/** Request-time snapshot for one script request, the way the runner's route handler takes it. */
async function snapshotAtRequest(cdp, url) {
  try {
    const scripts = await captureTrustedScripts(cdp, pageUrl);
    const hit = scripts.find((script) => script.src === url);
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    return {
      url,
      present: Boolean(hit),
      integrity: hit?.integrity ?? null,
      scriptElements: scripts.length,
      readyState: result.value,
    };
  } catch (error) {
    return { url, present: false, integrity: null, error: String(error) };
  }
}

function fileName(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").pop() || parsed.hostname;
  } catch {
    return url;
  }
}

function abbreviate(value) {
  if (!value) return "null";
  return value.length > 22 ? `${value.slice(0, 22)}…` : value;
}

/** One navigation: every first script request is snapshotted, then the settled DOM is captured. */
async function observe(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: "block",
    acceptDownloads: false,
    userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  const initiators = new Map();
  cdp.on("Network.requestWillBeSent", (event) => {
    if (event.type === "Script") {
      initiators.set(event.request.url, {
        type: event.initiator?.type ?? "?",
        hasStack: Boolean(event.initiator?.stack),
      });
    }
  });
  const boundary = [];
  const seen = new Set();
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.resourceType() === "script" && !seen.has(url)) {
      seen.add(url);
      boundary.push(await snapshotAtRequest(cdp, url));
    }
    await route.continue();
  });

  await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  let ready = true;
  try {
    await page.waitForSelector(readySelector, { state: "attached", timeout: 15_000 });
    await page.waitForTimeout(500);
  } catch {
    ready = false;
  }
  const finalScripts = await captureTrustedScripts(cdp, page.url());
  await context.close();
  const pinUrl = pinFlag ?? finalScripts.find((script) => RUNTIME_FILE_RE.test(script.src))?.src ?? null;
  return { ready, boundary, initiators, finalScripts, pinUrl };
}

function formatInitiator(initiator) {
  if (!initiator) return "?";
  return `${initiator.type}${initiator.hasStack ? "+stack" : ""}`;
}

function formatFinalIntegrity(final) {
  if (!final) return "(not in final DOM)";
  return final.integrity ? abbreviate(final.integrity) : "none";
}

function formatRow(row, { initiators, finalScripts, pinUrl }) {
  const final = finalScripts.find((script) => script.src === row.url);
  return [
    `${row.url === pinUrl ? "* " : ""}${fileName(row.url)}`,
    formatInitiator(initiators.get(row.url)),
    row.present ? "yes" : "NO",
    abbreviate(row.integrity),
    formatFinalIntegrity(final),
    row.scriptElements ?? "",
    row.readyState ?? row.error ?? "",
  ].join(" | ");
}

function printRun(runIndex, observation) {
  const { ready, boundary, finalScripts, pinUrl } = observation;
  console.log(
    `\n=== run ${runIndex + 1} — ready selector ${ready ? "observed" : "NOT observed"}${pinUrl ? "" : " — no pinned runtime found on the page"}`
  );
  console.log(
    "file | initiator | element in DOM at request | integrity at request | integrity in final DOM | script[src] count at request | readyState"
  );
  for (const row of boundary) console.log(formatRow(row, observation));
  const pinned = boundary.find((row) => row.url === pinUrl);
  const finalPinned = finalScripts.find((script) => script.src === pinUrl);
  if (pinUrl) {
    console.log(
      `Preflight domIntegrity for ${fileName(pinUrl)} would be ${pinned?.integrity ?? "null"}; the final DOM tag carries ${finalPinned?.integrity ?? "none"}.`
    );
  }
  return {
    pinFound: Boolean(pinUrl),
    presentAtRequest: Boolean(pinned?.present),
    finalIntegrity: finalPinned?.integrity ?? null,
  };
}

const browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
const results = [];
try {
  for (let index = 0; index < runs; index += 1) results.push(printRun(index, await observe(browser)));
} finally {
  await browser.close();
}

if (!results.every((result) => result.pinFound)) {
  console.error("\nNo pinned runtime on the page (pass --pin <runtime url> for a non-Beacon file).");
  process.exit(2);
}
const absent = results.filter((result) => !result.presentAtRequest).length;
const withIntegrity = results.filter((result) => result.finalIntegrity).length;
console.log(
  `\nSummary: pinned element absent from the DOM at request time in ${absent}/${results.length} runs (each such run reports "Script integrity is missing or wrong"); final DOM tag carried an integrity value in ${withIntegrity}/${results.length}.`
);
process.exit(absent > 0 ? 1 : 0);
