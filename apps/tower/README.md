# @codalyn/tower

Next.js app on Vercel: **Better Auth** (Drizzle + Neon), **Zustand**, **Tailwind + shadcn-style UI** (`shared/ui`), **Vercel Blob**, and **Webflow Data API** access for **Beacon** via an authenticated proxy.

## Layout (FSD + DDD)


| Layer          | Role                                                          |
| -------------- | ------------------------------------------------------------- |
| `src/app`      | Next.js App Router — routes, layouts, API handlers only.      |
| `src/widgets`  | Composed UI blocks (empty until features land).               |
| `src/features` | Use cases: auth client, image processing, blob helpers.       |
| `src/entities` | Domain nouns — e.g. `entities/webflow` (`WebflowDataClient`). |
| `src/shared`   | Config, `lib`, `ui`, cross-cutting stores.                    |
| `src/server`   | Server-only singletons (`auth`).                              |


Shared **Webflow + image defaults** live in `@codalyn/webflow-kit` (workspace package). Do not duplicate constants in Beacon or Tower.

## Scripts

```bash
pnpm app tower dev          # Next dev (Turbopack)
pnpm app tower build
pnpm app tower test
pnpm app tower db:push      # Drizzle → Neon (needs DATABASE_URL) — dev-only; see drizzle/README.md

# Migrations (see drizzle/README.md)
pnpm app tower db:generate        # after auth-schema.ts changes; commit SQL + drizzle/meta/
pnpm app tower db:check           # validate journal + snapshots before PR
pnpm app tower db:migrate:local   # .env + .env.local only (ignores DATABASE_URL in shell)
pnpm app tower db:reset:local -- --confirm   # wipe local Docker Postgres volume, migrate, seed operators
pnpm app tower db:seed:local      # seed/update local operators without wiping the DB
pnpm app tower db:migrate:dev     # TOWER_NEON_BRANCH_DEV + NEON_* (or TOWER_DATABASE_URL_DEV)
pnpm app tower db:migrate:preview # TOWER_NEON_BRANCH_PREVIEW + NEON_* (or TOWER_DATABASE_URL_PREVIEW)
pnpm app tower db:migrate:prod    # TOWER_NEON_BRANCH_PROD + NEON_*; requires `-- --confirm`
pnpm app tower db:migrate:dev:vercel     # Vercel Preview DATABASE_URL only (ignores TOWER_*)
pnpm app tower db:migrate:preview:vercel # same as dev:vercel
pnpm app tower db:migrate:prod:vercel    # Vercel Production DATABASE_URL; requires `-- --confirm`
```

Copy `.env.example` to `.env.local` and fill values before `pnpm build` or `db:push`.

### Local database reset

Wipes the **Docker Postgres volume** (`docker compose down -v`), re-applies migrations, and seeds operator accounts. Requires `--confirm` and a **localhost** `DATABASE_URL` (see `.env` / `.env.local`).

```bash
pnpm app tower db:reset:local -- --confirm
```

Set in `apps/tower/.env`:

```bash
TOWER_PRODUCT_ADMIN_EMAILS=miles@example.com   # comma-separated
# TOWER_LOCAL_DEV_PASSWORD=codalyn-local-dev    # optional; this is the default
```

After reset, sign in at `http://localhost:3100/sign-in` with a seeded email and the dev password. Open `/console` for the operator UI.

To create or refresh operator logins **without** wiping data:

```bash
pnpm app tower db:seed:local
```

`db:seed:local` resets passwords for listed emails to `TOWER_LOCAL_DEV_PASSWORD` (or the default). See [drizzle/README.md](drizzle/README.md) for migration commands.

**Runtime operator promotion:** on first `GET /api/health` per process, `syncProductAdminRolesFromEnv` sets `user.role = product_admin` for emails in `TOWER_PRODUCT_ADMIN_EMAILS` when those **user rows already exist** (preview/prod). Local reset/seed creates the rows and credentials for you.

### Local URL / port (dev owns **3100**)

**`pnpm app tower dev`** defaults to **http://localhost:3100** (`scripts/dev.mjs`) and uses **local** `DATABASE_URL` from `.env` / `.env.local`. Treat **3100** as the host port for **Tower dev** (Turbopack / HMR) during normal monorepo work.

Remote Neon (same `TOWER_DATABASE_URL_*` as `db:migrate:*` — set in `.env.local`):

```bash
pnpm app tower dev:neon      # Neon development branch
pnpm app tower dev:preview   # Neon preview branch
```

`prod` is rejected for dev. Default `pnpm dev` at the repo root is unchanged (local DB unless you run Tower with one of the commands above).

## Docker (isolated stack)

Tower has its **own** Compose project name, image name, container name, and network so it does not collide with other Docker projects on the same machine.

**Compose vs dev on 3100:** the **`tower`** service maps **`${TOWER_PORT:-3100}:3000`**, same default host port as dev. You **cannot** run the **full** stack (Postgres + containerized Next) on **3100** while **`pnpm app tower dev`** is already listening there (`EADDRINUSE`). Use one of these:

| Situation | What to do |
| --------- | ---------- |
| **Dev on 3100 + Postgres in Docker** | From `apps/tower`: `docker compose up -d postgres`. Keep host `DATABASE_URL` on `127.0.0.1:${POSTGRES_PORT:-35432}` (see `.env` / `.env.local`). Run **`pnpm app tower db:migrate:local`** when the DB is up. |
| **Full stack in Docker on 3100** | Stop **`pnpm app tower dev`**, then `pnpm app tower docker:up` (or `docker compose up --build -d` from `apps/tower`). |
| **Containerized Next and dev at the same time** | Set **`TOWER_PORT`** (e.g. **3101**) in `apps/tower/.env` and set **`BETTER_AUTH_URL`** and **`NEXT_PUBLIC_APP_URL`** in `.env.docker` to that same origin (e.g. `http://localhost:3101`). Set **`WEBFLOW_REDIRECT_URI`** only if you need an explicit override. |

From the repo root:

```bash
pnpm app tower docker:up      # full stack; host port = TOWER_PORT (default 3100 — free dev first)
pnpm app tower docker:down
```

Postgres only (typical with dev on **3100**):

```bash
cd apps/tower && docker compose up -d postgres
```


| Item            | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Compose project | `codalyn-tower` (`name` in `docker-compose.yml`)                                                       |
| Image           | `codalyn-tower:latest`                                                                                 |
| Container       | `codalyn-tower-app`                                                                                    |
| Network         | `codalyn-tower-net`                                                                                    |
| Host port       | **`${TOWER_PORT:-3100}`** → container `3000` (defaults to **3100**; conflicts with **dev** unless you change `TOWER_PORT` or stop dev) |


Build context is the **monorepo root** (`.dockerignore` keeps the context small). The image uses Next **standalone** output, runs as the `node` user, and includes a **healthcheck** on `/api/health`.

```bash
# From repo root
docker build -f apps/tower/Dockerfile -t codalyn-tower:latest .

# Compose from apps/tower (or use `pnpm app tower docker:up` from root)
cd apps/tower
cp .env.docker.example .env.docker   # set DATABASE_URL, BETTER_AUTH_*, URLs to match the host port you publish (see table above)
docker compose up --build -d
```

`pnpm.onlyBuiltDependencies` in the root `package.json` allows **sharp** (and **esbuild**) install scripts during `pnpm install` inside the image so the image optimizer works in the container.

## Beacon → Tower

**`/api/v1/*`** accepts:

1. **`Authorization: Bearer <BEACON_API_KEY>`** when `BEACON_API_KEY` is set on Tower (match `VITE_BEACON_API_KEY` in Beacon). Use this from the Designer extension; CORS on `/api/v1/*` allows cross-origin `fetch` with Bearer.
2. **Better Auth session** (cookie) when calling the API from the browser on Tower’s origin (e.g. dashboard).

The key in `VITE_BEACON_API_KEY` is **bundled in the extension** — acceptable for **local/dev** only; plan a token-exchange or OAuth-style flow before production.

**Beacon:** copy `apps/beacon/.env.example` → `.env.local`, set `VITE_TOWER_ORIGIN` to the Tower origin you run locally (typically **`http://localhost:3100`** when **`pnpm app tower dev`** is running). If you hit Tower via another host port (e.g. Docker with `TOWER_PORT=3101`), match that origin. Set `VITE_BEACON_API_KEY`. Use `towerFetch()` from `src/shared/lib/tower-client.ts` for requests to Tower.

**Tower:** set `BEACON_API_KEY` in `.env.local` or `.env.docker` (same value as Beacon’s `VITE_BEACON_API_KEY`).

### Webflow Data API (aligned with official docs)

Webflow’s [Working with the Data API](https://developers.webflow.com/data/docs/data-clients) overview points to [Authentication](https://developers.webflow.com/data/reference/authentication): every **v2** request uses `Authorization: Bearer YOUR_TOKEN`.

**OAuth (`WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` + optional `WEBFLOW_REDIRECT_URI` override):** Beacon “Connect Webflow” stores each signed-in user’s **OAuth access token** in Tower’s DB. **`GET|POST|… /api/v2/webflow/...`** forwards to `https://api.webflow.com/v2/...` using **only** that per-user token (no shared site/workspace env fallback). If `WEBFLOW_REDIRECT_URI` is unset, Tower derives it from `NEXT_PUBLIC_APP_URL`.

**Designer sign-in** (`POST /api/auth/webflow-designer`) may still need **`WEBFLOW_TOKEN_RESOLVE_BEARER`** (or **`WEBFLOW_API_TOKEN`**) with scope `authorized_user:read` until the user has connected Webflow and a stored token exists — see `apps/tower/.env.example`.

**Images:** `POST /api/v1/images/optimize?format=webp` (default) or `format=avif` (WebP stays default for Designer-safe pipelines).

## Pricing, billing, accounts & metering

**[docs/pricing-and-billing.md](docs/pricing-and-billing.md)** — single source of truth for the pricing model: the four plans (Free/Pro/Studio/Team), accounts and team roles, entitlement resolution, seats, and usage metering (caps, credits, pooled Team usage).

**[docs/stripe.md](docs/stripe.md)** — Stripe operations: products/price ids, Checkout/Portal, webhooks, env vars, deploy guards, and local testing with the Stripe CLI. **Disabled by default** until you set the flag and keys.

## Regenerating Better Auth Drizzle schema

If Better Auth’s core tables change, add a temporary `auth.config.ts` with `memoryAdapter()`, run:

`pnpm dlx auth@latest generate --config auth.config.ts --adapter drizzle --dialect postgresql --output src/shared/lib/db/auth-schema.ts -y`

Then remove the temp config and align `src/server/auth.ts` with the new schema.
