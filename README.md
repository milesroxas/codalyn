# Codalyn

Monorepo for the Codalyn product suite — Webflow tools and the Tower dashboard.

## Structure

```
apps/
  flint/      Webflow Designer Extension — class linter
  beacon/     Webflow Designer Extension — asset tooling
  tower/      Next.js dashboard (Vercel) — planned
packages/
  loadout/    @codalyn/loadout — Webflow runtime library (npm + jsDelivr)
```

Each app follows **Feature-Sliced Design**: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`.
Package boundaries act as **DDD bounded contexts** — no cross-app imports; cross-cut via `packages/*`.

Use this file for workspace setup and repo-wide commands; each app’s README covers that app’s architecture, local scripts, and internal documentation.

## Requirements

- Node >= 20
- pnpm >= 10

## Install

```bash
pnpm install
```

## Common commands

```bash
pnpm dev                              # all dev servers
pnpm dev --filter=@codalyn/flint      # single app
pnpm app <app> <command> [...args]    # run a command in a single app (e.g. pnpm app flint dev)
pnpm build                            # all builds
pnpm lint                             # biome across workspace
pnpm typecheck                        # tsc across workspace
pnpm test                             # vitest across workspace
```

### Webflow extension builds (flint, beacon)

Each Webflow Designer Extension app shares a single interactive build CLI at `scripts/build-cli.mjs`. It typechecks, runs `vite build`, calls `webflow extension bundle`, and writes a versioned zip to `apps/<app>/bundle/<channel>/<recipient>/`.

```bash
pnpm app <app> build           # interactive: prompts for channel + recipient
pnpm app <app> build:prod      # channel preset to production, prompts for recipient
pnpm app <app> build:dev       # channel preset to development, prompts for recipient
```

Applies to `flint` and `beacon`. Tower is a placeholder.

## Release — @codalyn/loadout

```bash
pnpm changeset          # author changeset
pnpm version            # bump versions + write CHANGELOG
pnpm release            # build + publish to npm
```

Published to npm; served via `https://cdn.jsdelivr.net/npm/@codalyn/loadout@<version>/dist/index.js`.
