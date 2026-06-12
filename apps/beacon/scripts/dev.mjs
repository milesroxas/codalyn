#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDevWithWorkspacePackages } from "../../../scripts/workspace-package-watch.mjs";

const beaconRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

runDevWithWorkspacePackages({
  cwd: beaconRoot,
  command: "pnpm",
  args: ["exec", "vite"],
});
