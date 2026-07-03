#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDevWithWorkspacePackages } from "../../../scripts/workspace-package-watch.mjs";

const beaconRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same dev harness as scripts/dev.mjs: build @codalyn/* packages once, keep their
// `tsc --watch` running so shared/ui components that consume @codalyn/webflow-kit
// hot-reload in Storybook when package source changes.
runDevWithWorkspacePackages({
  cwd: beaconRoot,
  command: "pnpm",
  args: ["exec", "storybook", "dev", "-p", "6006", ...process.argv.slice(2)],
});
