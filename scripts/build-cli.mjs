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
 * Moves every source map out of dist/ into a private zip next to the bundle archive, *before*
 * `webflow extension bundle` zips dist/. The Marketplace submission form requires source maps for a
 * minified bundle, uploaded in a private field from the exact same build — so they are produced on
 * every release build, but they must never ship inside bundle.zip (they would expose the full source
 * to every Designer session). Returns the archive path, or null when the build emitted no maps.
 */
function extractSourceMapsToPrivateZip(appPath, archivePath) {
  const maps = listDistSourceMaps(appPath);
  if (maps.length === 0) {
    return null;
  }
  const distDir = resolve(appPath, "dist");
  const staging = mkdtempSync(resolve(tmpdir(), "codalyn-sourcemaps-"));
  try {
    for (const rel of maps) {
      const dest = resolve(staging, rel);
      mkdirSync(dirname(dest), { recursive: true });
      renameSync(resolve(distDir, rel), dest);
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
  return { value: "quality-compare", label: "a flag-gated quality-compare popout reference" };
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
  ];
  if (!SENTRY_ALLOWED_APPS.has(appName)) {
    // An earlier review round flagged Sentry; it has since been removed from Beacon, but
    // posthog-js still ships a (never-called) Sentry integration. The strip plugin compiles that
    // out — this marker guarantees a reviewer's `grep -i sentry` over the bundle stays empty.
    forbidden.push({ value: "sentry", label: "a Sentry reference" });
  }
  const popoutMarker = qualityPopoutForbiddenMarker({ appName, appPath, channel });
  if (popoutMarker) {
    forbidden.push(popoutMarker);
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

function expectedBundleMarkers({ appName, appPath, channel, recipient, pkg }) {
  const expected = {
    version: pkg.version,
    recipient,
    forbidden: collectForbiddenBundleMarkers(appPath, channel, appName),
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
function matchForbiddenMarker(contents, forbidden) {
  if (!forbidden?.length) {
    return null;
  }
  const haystack = contents.toLowerCase();
  return forbidden.find(({ value }) => haystack.includes(value.toLowerCase())) ?? null;
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
}

function verifyArchivedZipExcludes(archivePath, forbidden) {
  if (!forbidden?.length) {
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
}

function verifyArchivedZipBundle(archivePath, markers) {
  verifyArchivedZipContains(archivePath, markers);
  verifyArchivedZipExcludes(archivePath, markers.forbidden);
  verifyArchivedZipHasNoSourceMaps(archivePath);
  verifyArchivedManifest(archivePath);
}

function extractSourceMapsOrExit(s, appPath, archivePath) {
  try {
    return extractSourceMapsToPrivateZip(appPath, archivePath);
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
    resolve(outDir, `${archiveBaseName}.sourcemaps.zip`)
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
  assertRequiredReleaseEnv,
  collectForbiddenBundleMarkers,
  extractSourceMapsToPrivateZip,
  findSourceMapEntries,
  listDistSourceMaps,
  matchForbiddenMarker,
  resolveViteEnvValue,
};
