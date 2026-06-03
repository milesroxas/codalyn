#!/usr/bin/env node
/**
 * Run workspace package `tsc --watch` processes alongside an app dev server.
 * Keeps `@codalyn/webflow-kit` / `@codalyn/observability` `dist/` in sync with `src/`
 * while Tower or Beacon dev is running.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const WORKSPACE_PACKAGES = ["@codalyn/webflow-kit", "@codalyn/observability"];

/**
 * @param {{
 *   cwd: string;
 *   command: string;
 *   args?: string[];
 *   env?: NodeJS.ProcessEnv;
 * }} options
 */
export function runDevWithWorkspacePackages(options) {
  const { cwd, command, args = [], env = {} } = options;
  /** @type {import("node:child_process").ChildProcess[]} */
  const children = [];
  let exiting = false;

  const shutdown = (code = 0) => {
    if (exiting) {
      return;
    }
    exiting = true;
    for (const child of children) {
      if (child.pid && !child.killed) {
        child.kill("SIGTERM");
      }
    }
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown(130));
  process.on("SIGTERM", () => shutdown(143));

  for (const pkg of WORKSPACE_PACKAGES) {
    const child = spawn("pnpm", ["--filter", pkg, "dev"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
      env: process.env,
    });
    child.on("exit", (code, signal) => {
      if (exiting) {
        return;
      }
      if (signal) {
        shutdown(1);
        return;
      }
      if (code !== 0 && code !== null) {
        shutdown(code);
      }
    });
    children.push(child);
  }

  const main = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  children.push(main);
  main.on("exit", (code, signal) => {
    if (signal) {
      shutdown(1);
      return;
    }
    shutdown(code ?? 1);
  });
}
