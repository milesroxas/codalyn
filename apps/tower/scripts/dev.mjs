#!/usr/bin/env node
/**
 * Default dev port when `PORT` is unset — keep in sync with Beacon `vite.config.ts` (`resolveTowerOrigin` fallback).
 * Override: `PORT=4000 pnpm app tower dev`
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const towerRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.PORT?.trim()) {
  process.env.PORT = "3100";
}

const child = spawn("npx", ["next", "dev", "--turbopack"], {
  stdio: "inherit",
  cwd: towerRoot,
  env: process.env,
  shell: true,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
