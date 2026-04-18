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
pnpm build                            # all builds
pnpm lint                             # biome across workspace
pnpm typecheck                        # tsc across workspace
pnpm test                             # vitest across workspace
```

## Release — @codalyn/loadout

```bash
pnpm changeset          # author changeset
pnpm version            # bump versions + write CHANGELOG
pnpm release            # build + publish to npm
```

Published to npm; served via `https://cdn.jsdelivr.net/npm/@codalyn/loadout@<version>/dist/index.js`.
