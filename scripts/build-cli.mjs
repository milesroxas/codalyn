#!/usr/bin/env node

/**
 * Codalyn Build CLI
 *
 * Shared interactive TUI for building and distributing Webflow Designer
 * Extension bundles across apps. Handles channel selection, recipient
 * targeting, and versioned output. Invoked from app package scripts.
 *
 * Pipeline: clean dist → tsc → vite build → webflow extension bundle → move
 * bundle.zip into bundle/<channel>/<recipient>/v<version>_<recipient>_<timestamp>.zip
 *
 * Usage:
 *   node scripts/build-cli.mjs --app <name> [--channel production|development]
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";
import color from "picocolors";
import { WEBFLOW_EXTENSION_BUNDLE_FILENAME, assertBundleOutputMatchesBuild } from "./extension-build.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const isNonInteractive = process.env.CI === "true" || !process.stdin.isTTY || !process.stdout.isTTY;

const BEACON_PRODUCTION_TOWER_ORIGIN = "https://tower.codalyn.app";

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
  { label: "Type checking", pct: 10 },
  { label: "Building with Vite", pct: 40 },
  { label: "Bundling extension", pct: 75 },
  { label: "Organizing output", pct: 95 },
];

async function resolveBuildChannel(channelArg) {
  if (channelArg && channelArg !== "production" && channelArg !== "development") {
    p.cancel(`Invalid --channel value: ${channelArg}`);
    process.exit(1);
  }
  if (channelArg) return channelArg;
  if (isNonInteractive) return "production";
  const picked = await p.select({
    message: "Build channel",
    options: [
      { value: "production", label: "Production", hint: "bundle/prod/ — for distribution" },
      { value: "development", label: "Development", hint: "bundle/development/ — for testing" },
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

function expectedBundleMarkers({ appName, channel, recipient, pkg }) {
  const expected = { version: pkg.version, recipient };
  if (appName === "beacon" && channel === "production") {
    expected.towerOrigin = BEACON_PRODUCTION_TOWER_ORIGIN;
  }
  return expected;
}

function verifyDistBundle(appPath, markers) {
  assertBundleOutputMatchesBuild(readAllDistJs(appPath), markers);
}

function verifyArchivedZipBundle(archivePath, markers) {
  verifyArchivedZipContains(archivePath, markers);
}

async function runBuildPipeline({ appPath, appName, pkg, channel, recipient }) {
  const channelDir = channel === "production" ? "prod" : "development";
  const viteMode = channel === "production" ? "production" : "development";
  const s = p.spinner();
  const viteEnv = buildViteEnv({ appName, channel, recipient });

  s.start(`${progressBar(STEPS[0].pct)}  ${STEPS[0].label}…`);
  const tscResult = await run("pnpm", ["exec", "tsc", "--noEmit"], { cwd: appPath });
  if (tscResult.status !== 0) {
    s.stop(color.red("Type check failed"));
    p.log.error(tscResult.stdout || tscResult.stderr || "Unknown error");
    process.exit(1);
  }

  s.message(`${progressBar(STEPS[1].pct)}  ${STEPS[1].label}…`);
  cleanDist(appPath);
  const markers = expectedBundleMarkers({ appName, channel, recipient, pkg });
  const viteResult = await run("pnpm", ["exec", "vite", "build", "--mode", viteMode], {
    cwd: appPath,
    env: viteEnv,
  });
  if (viteResult.status !== 0) {
    s.stop(color.red("Vite build failed"));
    p.log.error(viteResult.stdout || viteResult.stderr || "Unknown error");
    process.exit(1);
  }

  try {
    verifyDistBundle(appPath, markers);
  } catch (err) {
    s.stop(color.red("Build output verification failed"));
    p.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  s.message(`${progressBar(STEPS[2].pct)}  ${STEPS[2].label}…`);
  const bundleResult = await run("pnpm", ["exec", "webflow", "extension", "bundle", "--no-input"], {
    cwd: appPath,
  });
  if (bundleResult.status !== 0) {
    s.stop(color.red("Webflow bundle failed"));
    p.log.error(bundleResult.stdout || bundleResult.stderr || "Unknown error");
    process.exit(1);
  }

  s.message(`${progressBar(STEPS[3].pct)}  ${STEPS[3].label}…`);
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
    console.error("Usage: node scripts/build-cli.mjs --app <name> [--channel production|development]");
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

  const channel = await resolveBuildChannel(channelArg);
  const channelDir = channel === "production" ? "prod" : "development";
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
