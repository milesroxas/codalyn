#!/usr/bin/env node

/**
 * Codalyn Build CLI
 *
 * Shared interactive TUI for building and distributing Webflow Designer
 * Extension bundles across apps. Handles channel selection, recipient
 * targeting, and versioned output. Invoked from app package scripts.
 *
 * Pipeline: lint:all → test:run → clean dist → vite build → verify markers → extract source maps →
 *           webflow bundle → archive → verify archive
 *
 * Usage:
 *   node scripts/build-cli.mjs --app <name> [--channel production|development|preview]
 */

import { execSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import color from "picocolors";
import { assertBundleOutputMatchesBuild, WEBFLOW_EXTENSION_BUNDLE_FILENAME } from "./extension-build.mjs";
import { rewriteSourceMapVendorContent } from "./vite-strip-dev-host-literals.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const isNonInteractive = process.env.CI === "true" || !process.stdin.isTTY || !process.stdout.isTTY;

const BEACON_PRODUCTION_TOWER_ORIGIN = "https://tower.codalyn.app";
const BEACON_PREVIEW_TOWER_ORIGIN = "https://tower-preview.codalyn.app";
const VALID_BUILD_CHANNELS = ["production", "development", "preview"];

function channelOutputDir(channel) {
  if (channel === "production") return "production";
  if (channel === "preview") return "preview";
  return "development";
}

function parseArgs(argv) {
  const args = { app: null, channel: null };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--app" && next) {
      args.app = next;
      i++;
    } else if (key === "--channel" && next) {
      args.channel = next;
      i++;
    }
  }
  return args;
}

function progressBar(pct, width = 22) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `${color.cyan("█".repeat(filled))}${color.dim("░".repeat(empty))} ${color.dim(`${pct}%`)}`;
}

function run(cmd, args, { cwd, env = {} } = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      encoding: "utf-8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += d;
    });
    child.stderr?.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (status) => resolveRun({ status, stdout, stderr }));
  });
}

function getExistingRecipients(appPath, channelDir) {
  const dir = resolve(appPath, "bundle", channelDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function validateRecipientName(value) {
  if (!value || value.trim().length === 0) return "Name is required";
  if (!/^[a-z0-9_-]+$/.test(value)) return "Use only lowercase letters, numbers, underscores, or hyphens";
}

function buildTimestamp() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const MM = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");
  return `${mm}-${dd}_${HH}-${MM}-${SS}`;
}

const STEPS = [
  { label: "Lint & typecheck", pct: 5 },
  { label: "Running tests", pct: 15 },
  { label: "Building with Vite", pct: 45 },
  { label: "Bundling extension", pct: 75 },
  { label: "Organizing output", pct: 95 },
];

async function resolveBuildChannel(channelArg, appName) {
  if (channelArg && !VALID_BUILD_CHANNELS.includes(channelArg)) {
    p.cancel(`Invalid --channel value: ${channelArg}`);
    process.exit(1);
  }
  if (channelArg) return channelArg;
  if (isNonInteractive) return "production";
  // Only beacon bakes a Tower origin into its bundle (see beacon vite.config resolveTowerOrigin);
  // for other apps the channel only selects the output dir, so omit the Tower host from the hint.
  const towerHost =
    appName === "beacon"
      ? {
          production: " — tower.codalyn.app",
          preview: " — tower-preview.codalyn.app",
          development: " — local Tower default",
        }
      : { production: "", preview: "", development: "" };
  const picked = await p.select({
    message: "Build channel",
    options: [
      { value: "production", label: "Production", hint: `bundle/production/${towerHost.production}` },
      { value: "preview", label: "Preview", hint: `bundle/preview/${towerHost.preview}` },
      { value: "development", label: "Development", hint: `bundle/development/${towerHost.development}` },
    ],
  });
  if (p.isCancel(picked)) {
    p.cancel("Build cancelled.");
    process.exit(0);
  }
  return picked;
}

async function resolveRecipientName(appPath, channelDir) {
  const ciRecipient = process.env.BUILD_RECIPIENT ?? process.env.VITE_BUNDLE_RECIPIENT;
  if (ciRecipient?.trim()) return ciRecipient.trim();
  if (isNonInteractive) return "internal";

  const existing = getExistingRecipients(appPath, channelDir);
  const recipientOptions = [
    ...existing.map((r) => ({ value: r, label: r, hint: "existing" })),
    { value: "__new__", label: color.cyan("+ New recipient"), hint: "create a new distribution target" },
  ];
  const recipientChoice = await p.select({ message: "Recipient", options: recipientOptions });
  if (p.isCancel(recipientChoice)) {
    p.cancel("Build cancelled.");
    process.exit(0);
  }
  if (recipientChoice !== "__new__") return recipientChoice;
  const newName = await p.text({
    message: "Recipient name",
    placeholder: "acme_corp",
    validate: validateRecipientName,
  });
  if (p.isCancel(newName)) {
    p.cancel("Build cancelled.");
    process.exit(0);
  }
  return newName.trim();
}

function buildViteEnv({ appName, channel, recipient }) {
  const env = { VITE_BUNDLE_RECIPIENT: recipient };
  if (channel === "production") {
    env.VITE_BEACON_API_KEY = "";
    if (appName === "beacon") {
      env.VITE_TOWER_ORIGIN = BEACON_PRODUCTION_TOWER_ORIGIN;
      env.BEACON_ALLOW_LOCAL_TOWER_IN_PRODUCTION = "";
    }
  }
  if (channel === "preview") {
    env.VITE_BEACON_API_KEY = "";
    if (appName === "beacon") {
      env.VITE_TOWER_ORIGIN = BEACON_PREVIEW_TOWER_ORIGIN;
      env.BEACON_ALLOW_LOCAL_TOWER_IN_PRODUCTION = "";
    }
  }
  return env;
}

function cleanDist(appPath) {
  const distDir = resolve(appPath, "dist");
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
  }
}

function readAllDistJs(appPath) {
  const distDir = resolve(appPath, "dist");
  if (!existsSync(distDir)) {
    throw new Error(`Missing ${distDir} after Vite build`);
  }
  const parts = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".js")) {
        parts.push(readFileSync(full, "utf-8"));
      }
    }
  };
  walk(distDir);
  if (parts.length === 0) {
    throw new Error(`No JavaScript files under ${distDir}`);
  }
  return parts.join("\n");
}

/** Every `*.map` under dist/, as paths relative to dist/. */
function listDistSourceMaps(appPath) {
  const distDir = resolve(appPath, "dist");
  const maps = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".map")) {
        maps.push(relative(distDir, full));
      }
    }
  };
  if (existsSync(distDir)) {
    walk(distDir);
  }
  return maps.sort();
}

/**
 * Credential-shaped query parameter (`?token=` / `&token=`). The same shape is a forbidden bundle
 * marker (see staticForbiddenMarkers); it is re-checked on the source-map artifact because the
 * submission form uploads that artifact too and App Review Preflight scans what it is given.
 */
const CREDENTIAL_IN_QUERY_PATTERN = /[?&]token=/i;

/**
 * Cleartext-scheme URL (App Review Preflight "Insecure Protocols", 2026-09-14), minus the W3C
 * namespace URIs the rule itself exempts. The shipped bundle is gated on the same shape (see
 * staticForbiddenMarkers); this pattern is applied to the private source-map artifact, whose
 * embedded `sourcesContent` also carries vendor *comments* (license and reference links) that the
 * bundle never contains.
 */
const INSECURE_SCHEME_PATTERN = /\bhttp:\/\/(?!www\.w3\.org\/)/gi;

/**
 * Rewrites cleartext `http://` links inside a map's embedded source text to `https://`. Every
 * `http://` literal that survives into the shipped bundle fails the bundle gate first, so whatever
 * is left in `sourcesContent` is comment text or tree-shaken code — rewriting its scheme changes
 * no mapped position and no shipped behaviour, and keeps the artifact the submission form uploads
 * free of the shape the scanner flags. W3C namespace URIs are left as they are. Pure; exported for
 * tests.
 *
 * @param {{ sourcesContent?: (string | null)[] }} map parsed source map JSON
 */
export function rewriteSourceMapInsecureSchemes(map) {
  if (!Array.isArray(map?.sourcesContent)) {
    return map;
  }
  return {
    ...map,
    sourcesContent: map.sourcesContent.map((content) =>
      typeof content === "string" ? content.replace(INSECURE_SCHEME_PATTERN, "https://") : content
    ),
  };
}

/**
 * Moves every source map out of dist/ into a private zip next to the bundle archive, *before*
 * `webflow extension bundle` zips dist/. The Marketplace submission form requires source maps for a
 * minified bundle, uploaded in a private field from the exact same build — so they are produced on
 * every release build, but they must never ship inside bundle.zip (they would expose the full source
 * to every Designer session). Returns the archive path, or null when the build emitted no maps.
 *
 * Each map's embedded `sourcesContent` for audited vendor modules is rewritten to the post-transform
 * text (rewriteSourceMapVendorContent), so the private artifact carries no literal the bundle gate
 * forbids — in particular no token-in-query URL (App Review Preflight "Credential in URL",
 * 2026-08-19). `strict` mirrors the plugin option: release channels fail on any residual.
 */
function extractSourceMapsToPrivateZip(appPath, archivePath, options = {}) {
  const maps = listDistSourceMaps(appPath);
  if (maps.length === 0) {
    return null;
  }
  const strict = options.strict !== false;
  const distDir = resolve(appPath, "dist");
  const staging = mkdtempSync(resolve(tmpdir(), "codalyn-sourcemaps-"));
  try {
    for (const rel of maps) {
      const src = resolve(distDir, rel);
      const dest = resolve(staging, rel);
      mkdirSync(dirname(dest), { recursive: true });
      const rewritten = rewriteSourceMapInsecureSchemes(
        rewriteSourceMapVendorContent(JSON.parse(readFileSync(src, "utf-8")), { strict })
      );
      const serialized = JSON.stringify(rewritten);
      if (strict && CREDENTIAL_IN_QUERY_PATTERN.test(serialized)) {
        const index = serialized.search(CREDENTIAL_IN_QUERY_PATTERN);
        throw new Error(
          `Source map ${rel} contains a credential-in-query-string URL — it would ship in the private ` +
            `submission artifact. Context: …${serialized.slice(Math.max(0, index - 80), index + 80)}…`
        );
      }
      if (strict && new RegExp(INSECURE_SCHEME_PATTERN.source, "i").test(serialized)) {
        throw new Error(`Source map ${rel} still contains a cleartext http:// URL after rewriting`);
      }
      writeFileSync(dest, serialized);
      rmSync(src);
    }
    mkdirSync(dirname(archivePath), { recursive: true });
    rmSync(archivePath, { force: true });
    execSync(`zip -qr ${JSON.stringify(archivePath)} .`, { cwd: staging, stdio: "pipe" });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  if (listDistSourceMaps(appPath).length > 0) {
    throw new Error("Source maps remain in dist/ after extraction");
  }
  return archivePath;
}

/** Entry names inside a zip (one per line from `unzip -Z1`). */
function listArchiveEntries(archivePath) {
  return execSync(`unzip -Z1 ${JSON.stringify(archivePath)}`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Pure check for the archived-bundle source-map gate; exported for tests. */
function findSourceMapEntries(entries) {
  return entries.filter((name) => name.toLowerCase().endsWith(".map"));
}

/**
 * The shipped bundle must carry neither `.map` files nor a `sourceMappingURL` reference: maps go to
 * the private submission-form field only (see extractSourceMapsToPrivateZip).
 */
function verifyArchivedZipHasNoSourceMaps(archivePath) {
  const hit = findSourceMapEntries(listArchiveEntries(archivePath));
  if (hit.length > 0) {
    throw new Error(
      `Archived zip contains source map(s): ${hit.join(", ")} — maps must ship only in the private sourcemaps zip`
    );
  }
}

/** Documented Designer Extension manifest properties (developers.webflow.com/apps/designer/guides/configuring-your-app). */
const WEBFLOW_MANIFEST_ALLOWED_KEYS = [
  "name",
  "publicDir",
  "size",
  "apiVersion",
  "appIntents",
  "appConnections",
  "featureFlags",
];
const WEBFLOW_MANIFEST_ALLOWED_SIZES = ["default", "comfortable", "large"];

/**
 * The `webflow` CLI stores its own telemetry consent (`telemetry.global`) inside webflow.json.
 * That block is a local dev artifact, not a documented manifest property, and shipping it was
 * flagged in Marketplace review — strip undocumented keys before bundling and validate `size`.
 */
function sanitizeWebflowManifest(appPath) {
  const manifestPath = resolve(appPath, "webflow.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const kept = {};
  let stripped = false;
  for (const key of Object.keys(manifest)) {
    if (WEBFLOW_MANIFEST_ALLOWED_KEYS.includes(key)) {
      kept[key] = manifest[key];
    } else {
      stripped = true;
    }
  }
  if (!WEBFLOW_MANIFEST_ALLOWED_SIZES.includes(kept.size)) {
    throw new Error(
      `webflow.json "size" must be one of ${WEBFLOW_MANIFEST_ALLOWED_SIZES.join(", ")} (got ${JSON.stringify(kept.size)})`
    );
  }
  if (stripped) {
    writeFileSync(manifestPath, `${JSON.stringify(kept, null, 2)}\n`);
  }
}

function verifyArchivedManifest(archivePath) {
  let raw;
  try {
    raw = execSync(`unzip -p ${JSON.stringify(archivePath)} webflow.json`, {
      maxBuffer: 10 * 1024 * 1024,
    }).toString();
  } catch {
    throw new Error("Archived zip does not contain webflow.json");
  }
  const manifest = JSON.parse(raw);
  const extras = Object.keys(manifest).filter((key) => !WEBFLOW_MANIFEST_ALLOWED_KEYS.includes(key));
  if (extras.length > 0) {
    throw new Error(`Archived webflow.json contains undocumented keys: ${extras.join(", ")}`);
  }
  if (!WEBFLOW_MANIFEST_ALLOWED_SIZES.includes(manifest.size)) {
    throw new Error(`Archived webflow.json "size" is undocumented: ${JSON.stringify(manifest.size)}`);
  }
}

function verifyArchivedZipContains(archivePath, markers) {
  const needles = [markers.version, markers.recipient, markers.towerOrigin].filter(Boolean);
  for (const needle of needles) {
    try {
      execSync(`zipgrep -q ${JSON.stringify(needle)} ${JSON.stringify(archivePath)}`, {
        stdio: "ignore",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      throw new Error(`Archived zip does not contain expected build marker "${needle}"`);
    }
  }
}

/**
 * Env values that must not reach a release bundle — each entry rejects one flag value whose effect
 * would ship silently. The build must fail instead of quietly producing the wrong bundle, in either
 * direction: a feature toggled *off* that should ship (dead UI in front of a reviewer) or a feature
 * toggled *on* that is withheld from the current Marketplace submission (undocumented surface in
 * front of a reviewer).
 *
 * `VITE_CMS_SLOTS_SURFACE_ENABLED`: this variable used to be an *enable* switch that
 * `isCmsSlotsSurfaceEnabled()` required to be exactly "true" under `import.meta.env.PROD` — but every
 * `.env*` file is gitignored, so it existed only on one developer's machine. A clean checkout or CI
 * release build therefore produced a bundle where CMS Slots — the flagship surface — rendered as a
 * permanently disabled home-screen tile with no explanation. A Marketplace reviewer reads that as a
 * broken or placeholder feature, which is the class of finding that has already cost four review rounds.
 * The flag is now a kill switch that defaults on, so the guard only has to catch an explicit disable.
 *
 * `VITE_QUALITY_COMPARE_POPOUT_ENABLED`: the quality-compare popout is flag-gated off and withheld
 * from Marketplace bundles for now (see apps/beacon/vite.config.ts). A stray `=true` in a gitignored
 * `.env*` would ship a popup surface absent from the review notes and demo video. Delete this entry
 * when the popout is cleared to ship again.
 */
const FORBIDDEN_RELEASE_ENV = {
  beacon: [
    {
      key: "VITE_CMS_SLOTS_SURFACE_ENABLED",
      rejected: "false",
      problem: "ships the CMS Slots surface disabled — reviewers would see a dead feature",
      hint: "remove the override from your .env* files or CI environment before building a release bundle",
    },
    {
      key: "VITE_QUALITY_COMPARE_POPOUT_ENABLED",
      rejected: "true",
      problem:
        "ships the quality-compare popout, which is withheld from the current Marketplace submission — " +
        "reviewers would see an undocumented popup feature",
      hint:
        "remove the override from your .env* files or CI environment, or delete this " +
        "FORBIDDEN_RELEASE_ENV entry once the popout is cleared to ship",
    },
    // Review round 8 (2026-09-17). PostHog telemetry is withheld from Marketplace bundles: four rounds of
    // findings targeted the SDK (web experiments, token-in-query URLs, session-replay code, now
    // exception redaction). The reduced build ships no telemetry SDK at all; `true` bundles it again
    // (opt-in, `before_send`-redacted) and needs an App Update review of its own.
    {
      key: "VITE_BEACON_TELEMETRY_ENABLED",
      rejected: "true",
      problem:
        "bundles the PostHog telemetry SDK, which is withheld from the current Marketplace submission — " +
        "the submitted privacy disclosure states this build sends no telemetry",
      hint:
        "remove the override from your .env* files or CI environment, or delete this " +
        "FORBIDDEN_RELEASE_ENV entry once telemetry is cleared to ship (and update the disclosure)",
    },
    // App Review Preflight "Silent Canvas Mutations" (re-flagged on every scan through 2026-09-17). The
    // Lexical rich-text editor is withheld from Marketplace bundles: it constructs a MutationObserver on
    // editor-root attach, which the scanner reports regardless of what the observer watches. `true`
    // bundles the editor again and needs an App Update review of its own.
    {
      key: "VITE_BEACON_RICH_TEXT_EDITOR_ENABLED",
      rejected: "true",
      problem:
        "bundles the Lexical rich-text editor, which is withheld from the current Marketplace submission — " +
        "it reintroduces the MutationObserver that App Review Preflight flags as a silent canvas mutation",
      hint:
        "remove the override from your .env* files or CI environment, or delete this " +
        "FORBIDDEN_RELEASE_ENV entry once the editor is cleared to ship",
    },
    // Review round 8 (2026-09-17, Localization). The Marketplace build refuses CMS item writes on sites
    // with secondary locales instead of writing their primary locale; the listing says so. `primary`
    // is the documented alternative and needs its own review + listing change.
    {
      key: "VITE_BEACON_LOCALIZED_SITE_CMS_WRITES",
      rejected: "primary",
      problem:
        "lets Beacon write the primary locale of sites that use Webflow Localization, which the current " +
        "Marketplace listing states Beacon does not do",
      hint:
        "remove the override from your .env* files or CI environment, or delete this " +
        "FORBIDDEN_RELEASE_ENV entry once localized-site writes are cleared to ship (and update the listing)",
    },
  ],
};

/** Vite reads these in order, later files winning; mirrors vite's `getEnvFilesForMode`. */
function viteEnvFilesForMode(mode) {
  return [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
}

/**
 * Reads one `KEY=value` entry from a dotenv file. Returns null — never a guessed default — when
 * the file is missing or the key is absent, so the caller decides what "unset" means.
 */
function readEnvFileValue(filePath, key) {
  if (!existsSync(filePath)) {
    return null;
  }
  let value = null;
  for (const rawLine of readFileSync(filePath, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== key) {
      continue;
    }
    const raw = match[2].trim();
    const quoted = raw.match(/^(["'])([\s\S]*)\1$/);
    value = quoted ? quoted[2] : raw.replace(/\s+#.*$/, "").trim();
  }
  return value;
}

/**
 * Resolves the value Vite will inline for `key`, using Vite's own precedence: env files in
 * `viteEnvFilesForMode` order, then any `VITE_*` already present in the environment the build is
 * spawned with (vite's `loadEnv` applies `process.env` last, so inline values win).
 */
function resolveViteEnvValue({ appPath, mode, key, inlineEnv }) {
  let value = null;
  for (const envFile of viteEnvFilesForMode(mode)) {
    const fromFile = readEnvFileValue(resolve(appPath, envFile), key);
    if (fromFile !== null) {
      value = fromFile;
    }
  }
  if (key.startsWith("VITE_") && inlineEnv[key] !== undefined) {
    value = inlineEnv[key];
  }
  return value;
}

/** Release channels only; development builds are allowed to run with features toggled off. */
function assertRequiredReleaseEnv({ appName, appPath, channel, inlineEnv }) {
  if (channel !== "production" && channel !== "preview") {
    return;
  }
  for (const { key, rejected, problem, hint } of FORBIDDEN_RELEASE_ENV[appName] ?? []) {
    const resolved = resolveViteEnvValue({ appPath, mode: channel, key, inlineEnv });
    if (resolved?.trim() !== rejected) {
      continue;
    }
    throw new Error(
      `${key} resolves to ${JSON.stringify(rejected)} for this ${channel} build, which ${problem}. Fix: ${hint}.`
    );
  }
}

/**
 * Values that must never appear in a release bundle: local dev secrets/origins that Vite would
 * happily inline from .env/.env.local if the channel env in buildViteEnv ever stopped overriding
 * them (e.g. VITE_BEACON_API_KEY, a localhost Tower origin).
 */
// Apps that deliberately ship the Sentry SDK in release bundles. Beacon must stay Sentry-free
// (Marketplace round 3 removed it), so it is NOT in this list; Flint initializes @sentry/react in
// src/shared/lib/init-observability.ts, so its bundle legitimately contains Sentry code.
const SENTRY_ALLOWED_APPS = new Set(["flint"]);

/**
 * The quality-compare popout is flag-gated (apps/beacon/vite.config.ts). When the flag is off, no
 * trace may ship: not the entry files (quality-compare.html/.js/.css) and not the opener path in
 * bundle.js — its dead-code elimination is what this marker verifies. The protocol source constants
 * that legitimately remain bundled ("beacon-quality-popout-v1" et al.) do not contain this substring.
 */
function qualityPopoutForbiddenMarker({ appName, appPath, channel }) {
  if (appName !== "beacon") {
    return null;
  }
  const popoutFlag = resolveViteEnvValue({
    appPath,
    mode: channel,
    key: "VITE_QUALITY_COMPARE_POPOUT_ENABLED",
    inlineEnv: process.env,
  });
  if (popoutFlag?.trim() === "true") {
    return null;
  }
  return [
    { value: "quality-compare", label: "a flag-gated quality-compare popout reference" },
    // App Review Preflight (2026-09-14) "Insecure postMessage": the parent-side bridge's send path
    // (`postMessage({type:"compressed-updated"|"compressed-error"}, origin)`) is DCE'd with the flag
    // off; this message-type literal only exists inside that path.
    { value: "compressed-updated", label: "the flag-gated quality-compare popout bridge send path" },
  ];
}

/**
 * PostHog telemetry is flag-gated (apps/beacon/vite.config.ts, `__BEACON_TELEMETRY_ENABLED__`). With
 * the flag off — every Marketplace bundle — no trace of the SDK may ship: not the vendor chunk, not
 * the consent prompt copy that names the processor, not the ingestion host in the CSP. This marker
 * verifies the dead-code elimination end to end in dist and in the archived zip.
 */
function telemetryForbiddenMarker({ appName, appPath, channel }) {
  if (appName !== "beacon") {
    return null;
  }
  const telemetryFlag = resolveViteEnvValue({
    appPath,
    mode: channel,
    key: "VITE_BEACON_TELEMETRY_ENABLED",
    inlineEnv: process.env,
  });
  if (telemetryFlag?.trim() === "true") {
    return null;
  }
  return [{ value: "posthog", label: "a flag-gated PostHog telemetry reference" }];
}

/**
 * The Lexical rich-text editor is flag-gated (apps/beacon/vite.config.ts,
 * `__BEACON_RICH_TEXT_EDITOR_ENABLED__`). With the flag off — every Marketplace bundle — no trace of
 * it may ship, which is what proves the dead-code elimination took the whole dependency (and its
 * MutationObserver) rather than just the call site. Residual guard for the pinned count above.
 */
function richTextEditorForbiddenMarker({ appName, appPath, channel }) {
  if (appName !== "beacon") {
    return null;
  }
  const editorFlag = resolveViteEnvValue({
    appPath,
    mode: channel,
    key: "VITE_BEACON_RICH_TEXT_EDITOR_ENABLED",
    inlineEnv: process.env,
  });
  if (editorFlag?.trim() === "true") {
    return null;
  }
  return [{ value: "lexical", label: "a flag-gated Lexical rich-text editor reference" }];
}

function staticForbiddenMarkers(appPath, channel, appName) {
  // Marketplace round 4 (2026-08): reviewers flag dev hosts and URL-like placeholder domains in
  // shipped bundles. Bare substrings so any scheme/port/derivative form is caught; the Vite
  // transform in scripts/vite-strip-dev-host-literals.mjs plus source-side fixes are what make a
  // clean release build possible — this is the backstop that keeps regressions from shipping.
  // Matching is case-insensitive (see matchForbiddenMarker).
  const forbidden = [
    { value: "localhost", label: "a localhost reference" },
    { value: "127.0.0.1", label: "a loopback-IP reference" },
    { value: "tower.invalid", label: "the dev-only Tower placeholder origin" },
    { value: "codalyn.invalid", label: "the legacy placeholder email domain" },
    { value: "codalyn.beacon/", label: "the legacy publish-placeholder URL" },
    // Source maps are built (`sourcemap: "hidden"`) for the private submission field, so no shipped
    // file may reference one — a `//# sourceMappingURL=` comment means a map leaked into the bundle.
    { value: "sourceMappingURL", label: "a sourceMappingURL reference" },
    // App Review Preflight (2026-08-19) flags "Credential in URL": any `?token=` / `&token=` query
    // parameter in the shipped JS. posthog-js builds four such URLs (early-access features, product
    // tours, surveys, logs); the strip plugin compiles the token out of each. Credentials belong in
    // an Authorization header or request body, never a query string.
    { value: "?token=", label: "a credential-in-query-string URL (?token=)" },
    { value: "&token=", label: "a credential-in-query-string URL (&token=)" },
    // App Review Preflight (2026-08-19) flags "Fingerprinting & Session Replay" on any rrweb /
    // session-recorder reference. posthog-js's recorder controller is excised by the pnpm patch and
    // the strip plugin's residual guard proves it per vendor module; these markers are the whole-
    // bundle backstop (rrweb is posthog's recorder engine, FullStory the other named vendor,
    // `sessionRecording` / `recorder` posthog's controller, API and lazy-loader script name).
    { value: "rrweb", label: "an rrweb session-replay reference" },
    { value: "fullstory", label: "a FullStory session-replay reference" },
    { value: "sessionrecording", label: "a session-recording API reference" },
    { value: "recorder", label: "a session-recorder reference" },
    // Same preflight rule, "fingerprinting" half (re-flagged on the 10:53 build): the DOM-canvas
    // pixel-readback family is treated as a fingerprinting signal regardless of use. Beacon's image
    // export renders to an OffscreenCanvas and encodes with `convertToBlob` (canvas-to-blob.ts);
    // these markers keep the readback family out of release bundles for good.
    { value: ".toBlob(", label: "a canvas toBlob() pixel readback" },
    { value: "toDataURL", label: "a canvas toDataURL() pixel readback" },
    { value: "getImageData", label: "a canvas getImageData() pixel readback" },
  ];
  if (appName === "beacon") {
    // App Review Preflight (2026-09-14) "Prohibited Popups": Beacon opens no windows itself — every
    // external destination (Tower routes, the Webflow OAuth consent screen, policy pages) is an
    // ordinary `<a target="_blank" rel="noopener noreferrer">`. The flag-gated quality-compare popout
    // is the only remaining source-level caller and is DCE'd on release channels. Beacon-only until
    // Flint ports the same anchor-based flows (its auth/connect popups still call window.open).
    forbidden.push({ value: "window.open(", label: "a window.open call" });
    // App Review Preflight (2026-09-14) "Insecure postMessage": the rule fires on every `postMessage(`
    // whose second argument is not a string literal — including React's `MessagePort.postMessage(null)`
    // yield in the `scheduler` package, which has no targetOrigin parameter at all. Beacon has no
    // cross-window messaging left (auth and popout paths are gone), and the scheduler is patched to
    // yield through `scheduler.postTask()` (patches/scheduler@0.27.0.patch), so no shipped JS may
    // contain the call.
    forbidden.push({ value: "postMessage(", label: "a postMessage call" });
    // App Review Preflight (2026-09-14) "Insecure Protocols": no `http://` / `ws://` URL may ship. The
    // W3C namespace URIs React needs at runtime (`http://www.w3.org/2000/svg` …) are the rule's own
    // stated exception. Sources removed for this: posthog-js's yandex bot UA entry (strip rule) and the
    // better-auth/better-fetch client, which Beacon no longer bundles (first-party session client).
    forbidden.push({ pattern: /\bhttp:\/\/(?!www\.w3\.org\/)/i, label: "an insecure http:// URL" });
    forbidden.push({ pattern: /\bws:\/\//i, label: "an insecure ws:// URL" });
    // App Review Preflight (2026-09-14) "Unsafe HTML Injection": no HTML-injection sink write may
    // ship — react-dom's three `.innerHTML =` sites are compiled into throws (strip plugin) and the
    // published-site runtime renders sanitized DOM nodes instead of assigning `innerHTML`. Reads
    // (`x.innerHTML` on the right-hand side) and react-dom's `case "innerHTML":` labels are not sinks.
    forbidden.push({ pattern: /\.(?:inner|outer)html\s*=(?!=)/i, label: "an innerHTML/outerHTML write" });
    forbidden.push({ value: "insertAdjacentHTML(", label: "an insertAdjacentHTML call" });
    forbidden.push({ value: "document.write(", label: "a document.write call" });
    // App Review Preflight (2026-09-17, compliance doc R8.10) "External API Calls / third-party data
    // egress": the evidence excerpt landed on the session-token module's one-time
    // `localStorage.removeItem("…session-token")` cleanup. The bearer lives in memory only, so no
    // Web Storage call keyed by a credential name may ship; and no request may declare a cookie-bearing
    // mode — `extensionFetch` pins `credentials: "omit"` for every call (Marketplace guidelines,
    // "Credentials and secrets": credential-bearing headers never go to non-Webflow domains).
    forbidden.push({
      pattern:
        /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*["'`][^"'`]*(?:token|bearer|secret|password|credential)[^"'`]*["'`]/i,
      label: "a credential-named Web Storage key",
    });
    forbidden.push({
      pattern: /\bcredentials\s*:\s*["'`](?:include|same-origin)["'`]/i,
      label: "a cookie-bearing request (credentials: include / same-origin)",
    });
  }
  if (!SENTRY_ALLOWED_APPS.has(appName)) {
    // An earlier review round flagged Sentry; it has since been removed from Beacon, but
    // posthog-js still ships a (never-called) Sentry integration. The strip plugin compiles that
    // out — this marker guarantees a reviewer's `grep -i sentry` over the bundle stays empty.
    forbidden.push({ value: "sentry", label: "a Sentry reference" });
  }
  const popoutMarkers = qualityPopoutForbiddenMarker({ appName, appPath, channel });
  if (popoutMarkers) {
    forbidden.push(...popoutMarkers);
  }
  const telemetryMarkers = telemetryForbiddenMarker({ appName, appPath, channel });
  if (telemetryMarkers) {
    forbidden.push(...telemetryMarkers);
  }
  const richTextEditorMarkers = richTextEditorForbiddenMarker({ appName, appPath, channel });
  if (richTextEditorMarkers) {
    forbidden.push(...richTextEditorMarkers);
  }
  return forbidden;
}

function collectForbiddenBundleMarkers(appPath, channel, appName) {
  if (channel !== "production" && channel !== "preview") {
    return [];
  }
  const forbidden = staticForbiddenMarkers(appPath, channel, appName);
  // Sweep every env file Vite loads for this channel (.env, .env.local, .env.<mode>,
  // .env.<mode>.local) — a secret in .env.production.local gets inlined just as readily as one
  // in .env.local, so the sweep must cover the same file set as viteEnvFilesForMode.
  const seenValues = new Set();
  for (const envFile of viteEnvFilesForMode(channel)) {
    const envPath = resolve(appPath, envFile);
    if (!existsSync(envPath)) {
      continue;
    }
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const match = line.match(/^\s*(VITE_[A-Z0-9_]*(?:KEY|TOKEN|SECRET)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (!match) {
        continue;
      }
      const value = match[2].replace(/^["']|["']$/g, "");
      if (value.length >= 16 && !seenValues.has(value)) {
        seenValues.add(value);
        forbidden.push({ value, label: `the local ${match[1]} value` });
      }
    }
  }
  return forbidden;
}

/**
 * Pinned inventory of scanner-shaped tokens that legitimately remain in a Beacon release bundle.
 * App Review Preflight (2026-09-14) reports every bare `fetch(` as "External API Calls" and every
 * `new MutationObserver(` as "Silent Canvas Mutations", listing at most three locations per finding,
 * so the whole-artifact count is what matters, not the listed sites. A count above the pin means a
 * new call site crept in — route it through the chokepoint (`extensionFetch`) or remove it; a count
 * below means the accepted inventory here and the reviewer note in
 * docs/webflow-marketplace/compliance-record.md need updating together. `expected` is exact on purpose.
 */
function pinnedMarkerCounts(appName, channel) {
  if (appName !== "beacon" || (channel !== "production" && channel !== "preview")) {
    return [];
  }
  return [
    {
      // Excludes property calls (`window.fetch(`), identifiers that end in fetch (`towerFetch(`,
      // `refetch(`) and the `fetch` transport name posthog-js passes around as a string.
      pattern: /(?<![\w$.])fetch\(/g,
      label: "bare fetch( call",
      expected: 1,
      note: "the single egress point is extensionFetch in apps/beacon/src/shared/lib/extension-egress.ts",
    },
    {
      // App Review Preflight reported "Silent Canvas Mutations" on this token in four consecutive scans
      // (R7b.11 → R8.7). The only construction was Lexical's contenteditable sync, scoped to the editor
      // inside the extension panel; it is now flag-gated out of Marketplace bundles
      // (VITE_BEACON_RICH_TEXT_EDITOR_ENABLED, compliance doc R8.8), so the shipped inventory is zero.
      // Beacon writes to the canvas only through the Designer API, on an explicit user action.
      pattern: /new MutationObserver\(/g,
      label: "MutationObserver construction",
      expected: 0,
      note: "Beacon ships none; the rich-text editor that constructed one is withheld by release flag (R8.8)",
    },
    {
      // Review round 8 (2026-09-17) "CSP permits inline style attributes": the shipped policy is now
      // `style-src-attr 'none'`. React, Radix, vaul and Lexical style the extension document through
      // the CSSOM (not governed by CSP), so the only attribute-style writes that may ship are the two
      // Webflow Designer API calls that set the CMS Slots placeholder style on the user's *canvas*
      // element (`DOMElement.setAttribute` in cms-slot-list-target-designer-placeholder.ts and
      // create-cms-slot-list-target-component.ts) — a different document, outside the extension's CSP.
      // A third site means something now writes a style attribute in the extension document.
      pattern: /setAttribute\(\s*["'`]style["'`]/g,
      label: "style-attribute write (setAttribute)",
      expected: 2,
      note: "the two Designer API canvas writes in apps/beacon/src/features/cms-slots/model (compliance doc R8.5)",
    },
    {
      // Review round 8 (2026-09-17, compliance doc R8.10) "External API Calls / third-party data egress":
      // the single egress point pins `credentials: "omit"`, so no cookie is sent to, or stored from, any
      // destination. Exactly one occurrence — the pin in extensionFetch. A second means another request
      // builder sets its own cookie mode; zero means the pin was dropped.
      pattern: /\bcredentials:\s*["'`]omit["'`]/g,
      label: "credentials: omit request option",
      expected: 1,
      note: "extensionFetch pins the cookie mode for every request (compliance doc R8.10)",
    },
  ];
}

/**
 * Fails when a pinned token's count in `contents` differs from its pin. `where` names the artifact
 * in the error (dist output vs archived zip) so the operator knows which stage tripped.
 */
function assertPinnedMarkerCounts(contents, pinned, where) {
  for (const marker of pinned ?? []) {
    const found = contents.match(marker.pattern)?.length ?? 0;
    if (found !== marker.expected) {
      throw new Error(
        `${where} contains ${found} ${marker.label}${found === 1 ? "" : "s"}, expected exactly ${marker.expected} ` +
          `(${marker.note}). App Review Preflight flags this shape wherever it appears; fix the new site at the ` +
          "source or, if the inventory changed deliberately, update pinnedMarkerCounts in scripts/build-cli.mjs " +
          "and the compliance doc together."
      );
    }
  }
}

/**
 * Bundle retention. Every `build:prod` leaves a zip + sourcemaps pair behind, and a fix loop against
 * App Review Preflight produces a dozen a day; only the ones that were uploaded or scanned matter
 * afterwards. Per app: keep the newest `keepNewest` builds in place, move any older build that a doc
 * under `docs/` names (scan targets, submission artifacts — their sha256s live next to the name) to
 * `bundle/archive/<channel>/<recipient>/`, delete the rest. Unlisted apps are never pruned.
 */
const BUNDLE_RETENTION = {
  beacon: { keepNewest: 2 },
};

/** `v0.1.0_public_09-14_13-22-03` from either archive file name, or null for anything else. */
function archiveBaseName(fileName) {
  const match = fileName.match(/^(v\d+\.\d+\.\d+_[a-z0-9-]+_\d{2}-\d{2}_\d{2}-\d{2}-\d{2})(?:\.sourcemaps)?\.zip$/);
  return match ? match[1] : null;
}

/** Base names of every build artifact mentioned in a Markdown file under `docsDir` (recursive). */
function referencedArchiveBaseNames(docsDir) {
  const names = new Set();
  if (!existsSync(docsDir)) {
    return names;
  }
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        for (const match of readFileSync(full, "utf-8").matchAll(
          /v\d+\.\d+\.\d+_[a-z0-9-]+_\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?=(?:\.sourcemaps)?\.zip)/g
        )) {
          names.add(match[0]);
        }
      }
    }
  };
  walk(docsDir);
  return names;
}

/**
 * Applies the retention rule to one output directory. Builds are ordered by base name (the
 * timestamp is zero-padded `MM-DD_HH-mm-ss`, so lexical order is build order within a year); a zip
 * and its `.sourcemaps.zip` always travel together. Returns what happened so the caller can log it.
 *
 * @param {{ outDir: string; archiveDir: string; keepNewest: number; referenced: Set<string> }} options
 * @returns {{ kept: string[]; archived: string[]; deleted: string[] }}
 */
function pruneBundleArchives({ outDir, archiveDir, keepNewest, referenced }) {
  const result = { kept: [], archived: [], deleted: [] };
  if (!existsSync(outDir)) {
    return result;
  }
  const builds = new Map();
  for (const fileName of readdirSync(outDir)) {
    const base = archiveBaseName(fileName);
    if (base) {
      builds.set(base, [...(builds.get(base) ?? []), fileName]);
    }
  }
  const ordered = [...builds.keys()].sort();
  const kept = new Set(ordered.slice(-keepNewest));
  for (const base of ordered) {
    const files = builds.get(base);
    if (kept.has(base)) {
      result.kept.push(base);
    } else if (referenced.has(base)) {
      mkdirSync(archiveDir, { recursive: true });
      for (const fileName of files) {
        renameSync(resolve(outDir, fileName), resolve(archiveDir, fileName));
      }
      result.archived.push(base);
    } else {
      for (const fileName of files) {
        rmSync(resolve(outDir, fileName));
      }
      result.deleted.push(base);
    }
  }
  return result;
}

/** Runs {@link pruneBundleArchives} for an app's channel/recipient output after a successful build. */
function pruneBundleArchivesForApp({ appName, appPath, channelDir, recipient }) {
  const retention = BUNDLE_RETENTION[appName];
  if (!retention) {
    return null;
  }
  return pruneBundleArchives({
    outDir: resolve(appPath, "bundle", channelDir, recipient),
    archiveDir: resolve(appPath, "bundle", "archive", channelDir, recipient),
    keepNewest: retention.keepNewest,
    referenced: referencedArchiveBaseNames(resolve(ROOT, "docs")),
  });
}

function describePrune(result) {
  if (!result || (result.archived.length === 0 && result.deleted.length === 0)) {
    return null;
  }
  const parts = [];
  if (result.archived.length) {
    parts.push(`archived ${result.archived.length} doc-referenced build${result.archived.length === 1 ? "" : "s"}`);
  }
  if (result.deleted.length) {
    parts.push(`deleted ${result.deleted.length} unreferenced build${result.deleted.length === 1 ? "" : "s"}`);
  }
  return `Bundle retention: ${parts.join(", ")} (kept newest ${result.kept.length})`;
}

function expectedBundleMarkers({ appName, appPath, channel, recipient, pkg }) {
  const expected = {
    version: pkg.version,
    recipient,
    forbidden: collectForbiddenBundleMarkers(appPath, channel, appName),
    pinned: pinnedMarkerCounts(appName, channel),
  };
  if (appName === "beacon" && channel === "production") {
    expected.towerOrigin = BEACON_PRODUCTION_TOWER_ORIGIN;
  }
  if (appName === "beacon" && channel === "preview") {
    expected.towerOrigin = BEACON_PREVIEW_TOWER_ORIGIN;
  }
  return expected;
}

/**
 * Forbidden markers are matched case-insensitively. Reviewers grep with `grep -i`, and a
 * lowercase-only `includes` silently let vendor camelCase identifiers through — posthog-js's
 * `__forceAllowLocalhost` / `_forceAllowLocalhostNetworkCapture` passed a `localhost` gate that
 * was supposed to catch exactly that. Values are compared as plain substrings (never regexes), so
 * a genuine `http://localhost:3000` still trips the gate in any casing.
 *
 * @returns {{ value: string; label: string } | null} the first marker present, if any
 */
/**
 * A marker is either a bare substring (`value`, matched case-insensitively) or a `pattern` RegExp
 * (used where a substring cannot express an exception, e.g. `http://` minus the W3C namespace URIs).
 */
function matchForbiddenMarker(contents, forbidden) {
  if (!forbidden?.length) {
    return null;
  }
  const haystack = contents.toLowerCase();
  return (
    forbidden.find((marker) =>
      marker.pattern ? marker.pattern.test(contents) : haystack.includes(marker.value.toLowerCase())
    ) ?? null
  );
}

function verifyDistBundle(appPath, markers) {
  const contents = readAllDistJs(appPath);
  const hit = matchForbiddenMarker(contents, markers.forbidden);
  if (hit) {
    throw new Error(
      `Build output contains ${hit.label} — a forbidden value leaked into a release bundle. ` +
        "Check .env/.env.local overrides, the channel env in build-cli.mjs, and the strip rules in " +
        "scripts/vite-strip-dev-host-literals.mjs."
    );
  }
  assertBundleOutputMatchesBuild(contents, markers);
  assertPinnedMarkerCounts(contents, markers.pinned, "Build output");
}

function verifyArchivedZipExcludes(archivePath, forbidden, pinned) {
  if (!forbidden?.length && !pinned?.length) {
    return;
  }
  // Match in JS rather than a shell grep so forbidden values never pass through shell quoting.
  const contents = execSync(`unzip -p ${JSON.stringify(archivePath)}`, {
    maxBuffer: 50 * 1024 * 1024,
    encoding: "latin1",
  });
  const hit = matchForbiddenMarker(contents, forbidden);
  if (hit) {
    throw new Error(`Archived zip contains ${hit.label} — a forbidden value leaked into the release bundle`);
  }
  assertPinnedMarkerCounts(contents, pinned, "Archived zip");
}

function verifyArchivedZipBundle(archivePath, markers) {
  verifyArchivedZipContains(archivePath, markers);
  verifyArchivedZipExcludes(archivePath, markers.forbidden, markers.pinned);
  verifyArchivedZipHasNoSourceMaps(archivePath);
  verifyArchivedManifest(archivePath);
}

function extractSourceMapsOrExit(s, appPath, archivePath, channel) {
  try {
    return extractSourceMapsToPrivateZip(appPath, archivePath, { strict: channel !== "development" });
  } catch (err) {
    s.stop(color.red("Source map extraction failed"));
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function reportStepFailure(s, title, result) {
  s.stop(color.red(title));
  p.log.error(result.stdout || result.stderr || "Unknown error");
  process.exit(1);
}

function sanitizeWebflowManifestOrExit(s, appPath, title) {
  try {
    sanitizeWebflowManifest(appPath);
  } catch (err) {
    s.stop(color.red(title));
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

async function runBuildPipeline({ appPath, appName, pkg, channel, recipient }) {
  const channelDir = channelOutputDir(channel);
  const viteMode = channel;
  const viteEnv = buildViteEnv({ appName, channel, recipient });

  // Fail before lint/test/build: a missing release feature flag is a config problem, and the
  // operator should not wait out a full pipeline to hear about it.
  try {
    assertRequiredReleaseEnv({ appName, appPath, channel, inlineEnv: { ...process.env, ...viteEnv } });
  } catch (err) {
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const s = p.spinner();
  s.start(`${progressBar(STEPS[0].pct)}  ${STEPS[0].label}…`);
  const lintResult = await run("pnpm", ["lint:all"], { cwd: appPath });
  if (lintResult.status !== 0) {
    reportStepFailure(s, "Lint / typecheck failed", lintResult);
  }

  s.message(`${progressBar(STEPS[1].pct)}  ${STEPS[1].label}…`);
  const testResult = await run("pnpm", ["test:run"], { cwd: appPath });
  if (testResult.status !== 0) {
    reportStepFailure(s, "Tests failed", testResult);
  }

  s.message(`${progressBar(STEPS[2].pct)}  ${STEPS[2].label}…`);
  cleanDist(appPath);
  const markers = expectedBundleMarkers({ appName, appPath, channel, recipient, pkg });
  const viteResult = await run("pnpm", ["exec", "vite", "build", "--mode", viteMode], {
    cwd: appPath,
    env: viteEnv,
  });
  if (viteResult.status !== 0) {
    reportStepFailure(s, "Vite build failed", viteResult);
  }

  try {
    verifyDistBundle(appPath, markers);
  } catch (err) {
    s.stop(color.red("Build output verification failed"));
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const outDir = resolve(appPath, "bundle", channelDir, recipient);
  const archiveBaseName = `v${pkg.version}_${recipient}_${buildTimestamp()}`;
  const sourceMapArchivePath = extractSourceMapsOrExit(
    s,
    appPath,
    resolve(outDir, `${archiveBaseName}.sourcemaps.zip`),
    channel
  );

  s.message(`${progressBar(STEPS[3].pct)}  ${STEPS[3].label}…`);
  sanitizeWebflowManifestOrExit(s, appPath, "webflow.json manifest invalid");
  // DO_NOT_TRACK=1 stops the Webflow CLI from auto-writing its telemetry consent block into
  // webflow.json mid-bundle (its --no-input consent flow otherwise stores `telemetry.global`
  // in the manifest, which then ships inside bundle.zip — flagged in Marketplace review).
  const bundleResult = await run("pnpm", ["exec", "webflow", "extension", "bundle", "--no-input"], {
    cwd: appPath,
    env: { DO_NOT_TRACK: "1" },
  });
  if (bundleResult.status !== 0) {
    reportStepFailure(s, "Webflow bundle failed", bundleResult);
  }
  // Repo hygiene: if the CLI wrote to the manifest anyway, strip it again so the artifact never
  // gets committed; the archived-zip verification below remains the hard gate.
  sanitizeWebflowManifestOrExit(s, appPath, "webflow.json manifest invalid after bundle");

  s.message(`${progressBar(STEPS[4].pct)}  ${STEPS[4].label}…`);
  const uploadBundlePath = resolve(appPath, WEBFLOW_EXTENSION_BUNDLE_FILENAME);
  if (!existsSync(uploadBundlePath)) {
    s.stop(color.red("Webflow bundle missing"));
    p.log.error(`Expected ${WEBFLOW_EXTENSION_BUNDLE_FILENAME} in apps/${appName}/ after webflow extension bundle`);
    process.exit(1);
  }

  const archiveFilename = `${archiveBaseName}.zip`;
  const archivePath = resolve(outDir, archiveFilename);
  mkdirSync(outDir, { recursive: true });
  renameSync(uploadBundlePath, archivePath);

  try {
    verifyArchivedZipBundle(archivePath, markers);
  } catch (err) {
    s.stop(color.red("Archived bundle verification failed"));
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  s.stop(`${progressBar(100)}  ${color.green("Build complete")}`);
  const pruneNote = describePrune(pruneBundleArchivesForApp({ appName, appPath, channelDir, recipient }));
  if (pruneNote) {
    p.log.info(pruneNote);
  }
  return { channelDir, archiveFilename, archivePath, sourceMapArchivePath };
}

async function main() {
  const { app: appArg, channel: channelArg } = parseArgs(process.argv.slice(2));

  if (!appArg) {
    console.error("Usage: node scripts/build-cli.mjs --app <name> [--channel production|development|preview]");
    process.exit(1);
  }

  const appPath = resolve(ROOT, "apps", appArg);
  const pkgPath = resolve(appPath, "package.json");

  if (!existsSync(pkgPath)) {
    console.error(`App not found: apps/${appArg}`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  console.clear();

  p.intro(`${color.bgCyan(color.black(`  ${appArg}  `))} ${color.dim("build cli")}  ${color.dim(`v${pkg.version}`)}`);

  const channel = await resolveBuildChannel(channelArg, appArg);
  const channelDir = channelOutputDir(channel);
  const recipient = await resolveRecipientName(appPath, channelDir);

  p.note(
    [
      `${color.dim("app")}        ${color.white(appArg)}`,
      `${color.dim("version")}    ${color.white(pkg.version)}`,
      `${color.dim("channel")}    ${color.white(channel)}`,
      `${color.dim("recipient")}  ${color.white(recipient)}`,
      `${color.dim("output")}     ${color.white(`apps/${appArg}/bundle/${channelDir}/${recipient}/`)}`,
    ].join("\n"),
    "Build summary"
  );

  const confirmed = isNonInteractive ? true : await p.confirm({ message: "Start build?", initialValue: true });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Build cancelled.");
    process.exit(0);
  }

  const {
    channelDir: outChannelDir,
    archiveFilename,
    sourceMapArchivePath,
  } = await runBuildPipeline({
    appPath,
    appName: appArg,
    pkg,
    channel,
    recipient,
  });

  const outLines = [
    `${color.green("✓")} ${color.cyan(`apps/${appArg}/bundle/${outChannelDir}/${recipient}/${archiveFilename}`)}`,
  ];
  if (sourceMapArchivePath) {
    outLines.push(
      `${color.green("✓")} ${color.cyan(relative(ROOT, sourceMapArchivePath))} ${color.dim("(private — submission form source-map field only, never the bundle)")}`
    );
  }
  p.outro(outLines.join("\n"));
}

/**
 * Only run the TUI when invoked as a script. Importing this module (release-gate tests) must not
 * kick off a build. `realpathSync` on both sides so a symlinked bin path still matches.
 */
function isDirectInvocation() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return realpathSync(resolve(entry)) === realpathSync(__filename);
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  main().catch((err) => {
    p.log.error(err.message);
    process.exit(1);
  });
}

/** Exported for scripts/__tests__ coverage of the release gates; not part of the CLI surface. */
export {
  archiveBaseName,
  assertPinnedMarkerCounts,
  assertRequiredReleaseEnv,
  collectForbiddenBundleMarkers,
  extractSourceMapsToPrivateZip,
  findSourceMapEntries,
  listDistSourceMaps,
  matchForbiddenMarker,
  pinnedMarkerCounts,
  pruneBundleArchives,
  pruneBundleArchivesForApp,
  referencedArchiveBaseNames,
  resolveViteEnvValue,
};
