#!/usr/bin/env node

/**
 * Codalyn Build CLI
 *
 * Shared interactive TUI for building and distributing Webflow Designer
 * Extension bundles across apps. Handles channel selection, recipient
 * targeting, and versioned output. Invoked from app package scripts.
 *
 * Pipeline: lint:all → test:run → clean dist → vite build → verify markers → webflow bundle → archive
 *
 * Usage:
 *   node scripts/build-cli.mjs --app <name> [--channel production|development|preview]
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
 * Values that must never appear in a release bundle: local dev secrets/origins that Vite would
 * happily inline from .env/.env.local if the channel env in buildViteEnv ever stopped overriding
 * them (e.g. VITE_BEACON_API_KEY, a localhost Tower origin).
 */
function collectForbiddenBundleMarkers(appPath, channel) {
  if (channel !== "production" && channel !== "preview") {
    return [];
  }
  const forbidden = [{ value: "http://localhost:3100", label: "a localhost Tower origin" }];
  for (const envFile of [".env", ".env.local"]) {
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
      if (value.length >= 16) {
        forbidden.push({ value, label: `the local ${match[1]} value` });
      }
    }
  }
  return forbidden;
}

function expectedBundleMarkers({ appName, appPath, channel, recipient, pkg }) {
  const expected = { version: pkg.version, recipient, forbidden: collectForbiddenBundleMarkers(appPath, channel) };
  if (appName === "beacon" && channel === "production") {
    expected.towerOrigin = BEACON_PRODUCTION_TOWER_ORIGIN;
  }
  if (appName === "beacon" && channel === "preview") {
    expected.towerOrigin = BEACON_PREVIEW_TOWER_ORIGIN;
  }
  return expected;
}

function verifyDistBundle(appPath, markers) {
  assertBundleOutputMatchesBuild(readAllDistJs(appPath), markers);
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
  for (const { value, label } of forbidden) {
    if (contents.includes(value)) {
      throw new Error(`Archived zip contains ${label} — a local dev value leaked into the release bundle`);
    }
  }
}

function verifyArchivedZipBundle(archivePath, markers) {
  verifyArchivedZipContains(archivePath, markers);
  verifyArchivedZipExcludes(archivePath, markers.forbidden);
  verifyArchivedManifest(archivePath);
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
  const s = p.spinner();
  const viteEnv = buildViteEnv({ appName, channel, recipient });

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

  const outDir = resolve(appPath, "bundle", channelDir, recipient);
  const archiveFilename = `v${pkg.version}_${recipient}_${buildTimestamp()}.zip`;
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
  return { channelDir, archiveFilename, archivePath };
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

  const { channelDir: outChannelDir, archiveFilename } = await runBuildPipeline({
    appPath,
    appName: appArg,
    pkg,
    channel,
    recipient,
  });

  p.outro(
    `${color.green("✓")} ${color.cyan(`apps/${appArg}/bundle/${outChannelDir}/${recipient}/${archiveFilename}`)}`
  );
}

main().catch((err) => {
  p.log.error(err.message);
  process.exit(1);
});
