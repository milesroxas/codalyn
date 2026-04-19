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


Shared **Webflow + image defaults** live in `**@codalyn/webflow-kit`** (workspace package). Do not duplicate constants in Beacon or Tower.

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


Build context is the **monorepo root** (`.dockerignore` keeps the context small). The image uses Next **standalone** output, runs as the `**node`** user, and includes a **healthcheck** on `/api/health`.

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

1. User must be signed in (Better Auth session cookie or equivalent when you wire extension auth).
2. Call `**/api/v1/webflow/*`** — segments map to `https://api.webflow.com/v2/...` with `**WEBFLOW_API_TOKEN`** on the server.
3. Image pipeline: `**POST /api/v1/images/optimize?format=webp**` (default) or `**format=avif**`. WebP remains the default everywhere for Designer extension compatibility.

## Regenerating Better Auth Drizzle schema

If Better Auth’s core tables change, add a temporary `auth.config.ts` with `memoryAdapter()`, run:

`pnpm dlx auth@latest generate --config auth.config.ts --adapter drizzle --dialect postgresql --output src/shared/lib/db/auth-schema.ts -y`

Then remove the temp config and align `src/server/auth.ts` with the new schema.