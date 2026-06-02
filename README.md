# Codalyn

Monorepo for the Codalyn product suite — Webflow Designer tooling, a runtime library, and the Tower dashboard. Managed with **pnpm workspaces** + **Turborepo**.

## Workspaces

```
apps/
  flint/        Webflow Designer Extension — real-time class linter
  beacon/       Webflow Designer Extension — asset + CMS tooling (proxies through Tower)
  tower/        Next.js dashboard, auth/billing, and Webflow Data API proxy (Vercel)
packages/
  loadout/      @codalyn/loadout — Webflow runtime library (published to npm + jsDelivr)
  webflow-kit/  @codalyn/webflow-kit — shared Webflow Data API + image pipeline constants (Tower + Beacon)
  observability/ @codalyn/observability — shared PostHog + Sentry configuration
```

| Workspace | Description | Docs |
| --- | --- | --- |
| `apps/flint` | Real-time Webflow class linter (Designer Extension) | [README](apps/flint/README.md) |
| `apps/beacon` | Asset + CMS Designer Extension; calls Tower's API/proxy | [README](apps/beacon/README.md) · [AGENTS](apps/beacon/AGENTS.md) |
| `apps/tower` | Next.js dashboard: auth, billing, metering, Webflow Data API proxy | [README](apps/tower/README.md) · [pricing & billing](apps/tower/docs/pricing-and-billing.md) · [Stripe](apps/tower/docs/stripe.md) |
| `packages/loadout` | Webflow runtime library, published to npm | [README](packages/loadout/README.md) |
| `packages/webflow-kit` | Shared Webflow + image constants for Tower & Beacon | — |
| `packages/observability` | Shared PostHog + Sentry setup | — |

### Conventions

- Apps follow **Feature-Sliced Design**: `app/` → `pages/` → `widgets/` → `features/` → `entities/` → `shared/` (imports flow downward only).
- Package boundaries are **DDD bounded contexts**: **no cross-app imports** — share via `packages/*` (e.g. `@codalyn/webflow-kit`).
- Use this root README for workspace setup and repo-wide commands; each workspace README covers its own architecture, scripts, and internal docs.
- **AI agents** (Cursor, etc.): see **[`AGENTS.md`](AGENTS.md)** and **[`.cursor/rules/`](.cursor/rules)** for mandatory lint/typecheck, code-quality, and security expectations on every task.

## Requirements

- Node >= 20
- pnpm >= 10

## Install

```bash
pnpm install
```

## Common commands

Run from the repo root (Turborepo fans out per workspace):

```bash
pnpm dev                              # all dev servers
pnpm dev --filter=@codalyn/flint      # single workspace
pnpm app <app> <command> [...args]    # run a command in one app (e.g. pnpm app flint dev)
pnpm build                            # all builds
pnpm lint                             # biome check across workspaces
pnpm lint:fix                         # biome safe/format fixes
pnpm typecheck                        # tsc --noEmit across workspaces
pnpm verify                           # lint + typecheck (same graph as CI)
pnpm test                             # vitest across workspaces
pnpm format                           # biome format --write .
```

A `pre-commit` hook (simple-git-hooks + lint-staged) runs `biome check --write` on staged files.

### Webflow extension builds (flint, beacon)

Each Webflow Designer Extension app shares a single interactive build CLI at `scripts/build-cli.mjs`. It typechecks, runs `vite build`, calls `webflow extension bundle`, and writes a versioned zip to `apps/<app>/bundle/<channel>/<recipient>/`.

```bash
pnpm app <app> build           # interactive: prompts for channel + recipient
pnpm app <app> build:prod      # channel preset to production, prompts for recipient
pnpm app <app> build:dev       # channel preset to development, prompts for recipient
```

Applies to `flint` and `beacon`. Tower uses `pnpm app tower dev` / `pnpm app tower build`. Local Tower dev owns host port **3100** by default; Docker and Postgres are documented in `apps/tower/README.md` (including how to avoid port clashes).

## Release — @codalyn/loadout

```bash
pnpm changeset          # author changeset
pnpm version            # bump versions + write CHANGELOG
pnpm release            # build + publish to npm
```

Published to npm; served via `https://cdn.jsdelivr.net/npm/@codalyn/loadout@<version>/dist/index.js`.
