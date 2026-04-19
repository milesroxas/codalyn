# Beacon — Webflow Designer Extension

Asset tooling Designer Extension for Webflow. See the [Designer Extension docs](https://developers.webflow.com/designer/reference/introduction) for API reference.

Workspace setup, monorepo commands, and the shared Webflow extension bundle workflow are documented in the [repository root README](../../README.md).

## Development

From the repository root: `pnpm app beacon dev`. From this directory: `pnpm dev`.

Runs the Vite dev server (port 1337) with the Webflow extension template injected. Use the printed URL as the "Development URL" in the Webflow Designer Apps panel.

## Build

From this directory: `pnpm build`, `pnpm build:prod`, or `pnpm build:dev`. From the repository root: `pnpm app beacon build`, `pnpm app beacon build:prod`, or `pnpm app beacon build:dev`. Details (shared CLI, output paths) are in the root README.
