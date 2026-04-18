#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const [, , appName, command, ...restArgs] = process.argv;

if (!appName || !command) {
  console.error("Usage: pnpm app <app-name> <command> [...args]");
  process.exit(1);
}

const filter = appName.startsWith("@codalyn/") ? appName : `@codalyn/${appName}`;
const result = spawnSync("pnpm", ["--filter", filter, command, ...restArgs], {
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
