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
| `packages/observability` | Shared PostHog + Sentry setup | [README](packages/observability/README.md) |

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

### Tower database (Postgres / Drizzle)

Tower owns all database scripts. Run from the **repo root** with `pnpm app tower <script>`. Set `DATABASE_URL` in `apps/tower/.env.local` (see `apps/tower/.env.example`). Full workflow: [apps/tower/drizzle/README.md](apps/tower/drizzle/README.md).

**Local Postgres (Docker):**

```bash
cd apps/tower && docker compose up -d postgres   # or: pnpm app tower docker:up (full stack)
pnpm app tower db:migrate:local                # apply pending migrations
pnpm app tower dev                             # uses local DATABASE_URL (port 3100)
```

**Remote Neon:**

```bash
pnpm app tower db:migrate:dev                  # Neon dev branch (NEON_* + TOWER_NEON_BRANCH_DEV)
pnpm app tower db:migrate:preview              # Neon preview branch
pnpm app tower db:migrate:prod -- --confirm    # production — requires --confirm
pnpm app tower dev:neon                        # dev server against Neon dev branch
pnpm app tower dev:preview                     # dev server against Neon preview branch
```

**Schema & maintenance:**

```bash
pnpm app tower db:generate                     # after auth-schema.ts changes; commit SQL + drizzle/meta/
pnpm app tower db:check                        # validate journal + snapshots (run before PR)
pnpm app tower db:push                         # dev-only schema sync without migration files
pnpm app tower db:studio                       # Drizzle Studio (uses DATABASE_URL)
pnpm app tower db:reset:local -- --confirm     # wipe local Docker volume, migrate, seed operators
pnpm app tower db:seed:local                   # create/update operators only — does not wipe data
```

**Seed vs reset (local only):**

| Command | Wipes DB? | What it does |
| --- | --- | --- |
| `db:seed:local` | **No** | Creates or updates accounts in `TOWER_PRODUCT_ADMIN_EMAILS` (password, `product_admin` role). All other data stays. |
| `db:reset:local -- --confirm` | **Yes** | `docker compose down -v`, migrate, then seed. Fresh empty database. Requires localhost `DATABASE_URL`. |

Set `TOWER_PRODUCT_ADMIN_EMAILS` in `apps/tower/.env` or `.env.local` before seed/reset. Default password: `codalyn-local-dev` (or `TOWER_LOCAL_DEV_PASSWORD`).

Vercel-hosted DB targets: `db:migrate:dev:vercel`, `db:migrate:preview:vercel`, `db:migrate:prod:vercel -- --confirm`. More detail: [apps/tower/README.md](apps/tower/README.md).

### Webflow extension builds (flint, beacon)

Each Webflow Designer Extension app shares a single interactive build CLI at `scripts/build-cli.mjs`. Before bundling it runs **`pnpm lint:all`** (typecheck + lint) and **`pnpm test:run`** for that app, then builds with Vite, verifies baked-in markers, calls `webflow extension bundle`, and moves `bundle.zip` into `apps/<app>/bundle/<channel>/<recipient>/v<version>_<recipient>_<timestamp>.zip` (upload that file to Webflow).

```bash
pnpm app <app> build           # interactive: prompts for channel + recipient
pnpm app <app> build:prod      # production → bundle/production/ (Beacon: tower.codalyn.app)
pnpm app <app> build:preview   # preview → bundle/preview/ (Beacon: tower-preview.codalyn.app)
pnpm app <app> build:dev       # development → bundle/development/ (local Tower default)
```

Applies to `flint` and `beacon`. Tower uses `pnpm app tower dev` / `pnpm app tower build`. Local Tower dev owns host port **3100** by default; see **Tower database** above and [apps/tower/README.md](apps/tower/README.md) for Docker/Neon setup.

**Release gates (production + preview channels).** The build fails, on the compiled JS and again on the archived zip, if the output contains a forbidden marker (dev hosts, `sourceMappingURL`, credential-in-query URLs, session-replay / canvas-readback APIs, `window.open(` / `postMessage(` / `http://` / HTML-sink writes for Beacon, Sentry for Beacon, local `VITE_*KEY|TOKEN|SECRET` values) or if a **pinned inventory count** drifts — Beacon must contain exactly one bare `fetch(` (the egress chokepoint) and exactly one `new MutationObserver(` (Lexical). `scripts/vite-strip-dev-host-literals.mjs` compiles audited vendor literals out before the gate runs, and source maps are moved out of `dist/` into a private `<archive>.sourcemaps.zip` for the Marketplace submission form. Everything the gates enforce, and why, is in [docs/webflow-submission-playbook.md](docs/webflow-submission-playbook.md) and the round-by-round record in [docs/webflow-marketplace-compliance.md](docs/webflow-marketplace-compliance.md).

**Bundle retention (Beacon).** `bundle/` is gitignored. After each build the newest 2 builds per channel/recipient stay in place, older builds named in any `docs/*.md` (scanned or submitted artifacts, with their sha256) move to `bundle/archive/<channel>/<recipient>/`, and the rest are deleted (`BUNDLE_RETENTION` in `scripts/build-cli.mjs`). Record a zip's name in the compliance doc before the next build if it was uploaded anywhere.

## Release — @codalyn/loadout

```bash
pnpm changeset          # author changeset
pnpm version            # bump versions + write CHANGELOG
pnpm release            # build + publish to npm
```

Published to npm; served via `https://cdn.jsdelivr.net/npm/@codalyn/loadout@<version>/dist/index.js`.
