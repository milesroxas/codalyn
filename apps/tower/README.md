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
pnpm app tower db:push      # Drizzle → Neon (needs DATABASE_URL)
```

Copy `.env.example` to `.env.local` and fill values before `pnpm build` or `db:push`.

## Docker (isolated stack)

Tower has its **own** Compose project name, image name, container name, and network so it does not collide with other Docker projects on the same machine.


| Item            | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Compose project | `codalyn-tower` (`name` in `docker-compose.yml`)                                                       |
| Image           | `codalyn-tower:latest`                                                                                 |
| Container       | `codalyn-tower-app`                                                                                    |
| Network         | `codalyn-tower-net`                                                                                    |
| Host port       | `${TOWER_PORT:-3100}` → container `3000` (default **3100** avoids clashing with other local Next apps) |


Build context is the **monorepo root** (`.dockerignore` keeps the context small). The image uses Next **standalone** output, runs as the `node` user, and includes a **healthcheck** on `/api/health`.

```bash
# From repo root
docker build -f apps/tower/Dockerfile -t codalyn-tower:latest .

# Recommended: compose from apps/tower
cd apps/tower
cp .env.docker.example .env.docker   # set DATABASE_URL, BETTER_AUTH_*, URLs to match host port
docker compose up --build -d
```

`pnpm.onlyBuiltDependencies` in the root `package.json` allows **sharp** (and **esbuild**) install scripts during `pnpm install` inside the image so the image optimizer works in the container.

## Beacon → Tower

**`/api/v1/*`** accepts:

1. **`Authorization: Bearer <BEACON_API_KEY>`** when `BEACON_API_KEY` is set on Tower (match `VITE_BEACON_API_KEY` in Beacon). Use this from the Designer extension; CORS on `/api/v1/*` allows cross-origin `fetch` with Bearer.
2. **Better Auth session** (cookie) when calling the API from the browser on Tower’s origin (e.g. dashboard).

The key in `VITE_BEACON_API_KEY` is **bundled in the extension** — acceptable for **local/dev** only; plan a token-exchange or OAuth-style flow before production.

**Beacon:** copy `apps/beacon/.env.example` → `.env.local`, set `VITE_TOWER_ORIGIN` (e.g. `http://localhost:3100` with Docker) and `VITE_BEACON_API_KEY`. Use `towerFetch()` from `src/shared/lib/tower-client.ts` for requests to Tower.

**Tower:** set `BEACON_API_KEY` in `.env.local` or `.env.docker` (same value as Beacon’s `VITE_BEACON_API_KEY`).

### Webflow Data API (aligned with official docs)

Webflow’s [Working with the Data API](https://developers.webflow.com/data/docs/data-clients) overview points to [Authentication](https://developers.webflow.com/data/reference/authentication): every **v2** request uses `Authorization: Bearer YOUR_TOKEN`.

**OAuth (`WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` + `WEBFLOW_REDIRECT_URI`):** Beacon “Connect Webflow” stores each signed-in user’s **OAuth access token** in Tower’s DB. **`GET|POST|… /api/v2/webflow/...`** forwards to `https://api.webflow.com/v2/...` using **only** that per-user token (no shared site/workspace env fallback).

**Designer sign-in** (`POST /api/auth/webflow-designer`) may still need **`WEBFLOW_TOKEN_RESOLVE_BEARER`** (or **`WEBFLOW_API_TOKEN`**) with scope `authorized_user:read` until the user has connected Webflow and a stored token exists — see `apps/tower/.env.example`.

**Images:** `POST /api/v1/images/optimize?format=webp` (default) or `format=avif` (WebP stays default for Designer-safe pipelines).

## Regenerating Better Auth Drizzle schema

If Better Auth’s core tables change, add a temporary `auth.config.ts` with `memoryAdapter()`, run:

`pnpm dlx auth@latest generate --config auth.config.ts --adapter drizzle --dialect postgresql --output src/shared/lib/db/auth-schema.ts -y`

Then remove the temp config and align `src/server/auth.ts` with the new schema.