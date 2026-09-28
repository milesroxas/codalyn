# Tower database (Drizzle)

Schema source: `src/shared/lib/db/auth-schema.ts`. Generated artifacts in this folder (`*.sql`, `meta/`) are committed so deploys and teammates apply the same history.

## Commands (run from `apps/tower` with `DATABASE_URL` set)

| Script | Use |
|--------|-----|
| `pnpm db:generate` | After **editing** `auth-schema.ts`, produces SQL + snapshot. **Commit** the diff. |
| `pnpm db:migrate` | Applies **pending** migrations when `DATABASE_URL` is already set (CI, ad hoc). |
| `pnpm db:migrate:local` | Same as migrate using **only** `apps/tower/.env` + `.env.local` (clears shell `DATABASE_URL`). |
| `pnpm db:reset:local -- --confirm` | **Local only:** wipe Docker Postgres volume, migrate, seed `TOWER_PRODUCT_ADMIN_EMAILS` operators. |
| `pnpm db:seed:local` | **Local only:** create/update operator accounts from `TOWER_PRODUCT_ADMIN_EMAILS` without wiping the DB. |
| `pnpm db:migrate:dev` / `:preview` / `:prod` | Resolves URL via **Neon CLI** (`NEON_PROJECT_ID`, `NEON_API_KEY`, `TOWER_NEON_BRANCH_*`) or optional gitignored `TOWER_DATABASE_URL_*`. **`prod` requires `--confirm`** (or `TOWER_DB_MIGRATE_CONFIRM=1`). |
| `pnpm db:migrate:*:vercel` | **`vercel env pull`** only — ignores local `TOWER_*` overrides. Requires linked `apps/tower/.vercel`. |
| `pnpm db:push` | **Dev-only** shortcut: sync schema to DB **without** new migration files. Fast iteration; do not rely on this alone for releases. |
| `pnpm db:check` | Validates migration files against snapshots (good for CI). |
| `pnpm db:migrate:status:local` / `:dev` / `:preview` / `:prod` (+ `:prod:vercel`) | **Read-only** applied/pending report from `drizzle.__drizzle_migrations`; no `--confirm` needed; exit 0 = nothing pending, 2 = pending. Run it against prod before and after a release that carries a migration. |
| `pnpm db:beacon-preset-storage-migrate:local` | One-time JSON cleanup for legacy Beacon preset keys in `beacon_app_settings.payload` and `organization.beacon_team_settings`. Add `--dry-run` to preview. |
| `pnpm db:beacon-preset-storage-migrate:dev` / `:prod` | Same data migration against remote DB (Neon / Vercel env variants mirror `db:migrate`). |
| `pnpm db:studio` | Opens Drizzle Studio against `DATABASE_URL`. |

From the repo root, use `pnpm app tower <script>` (e.g. `pnpm app tower db:reset:local -- --confirm`).

## Local reset and operator seed

**`pnpm db:reset:local -- --confirm`** (localhost `DATABASE_URL` only):

1. `docker compose down -v` — deletes the `tower_pgdata` volume
2. `docker compose up -d postgres` — fresh Postgres
3. `pnpm db:migrate:local` — apply migrations
4. Seeds accounts for every email in **`TOWER_PRODUCT_ADMIN_EMAILS`** (`apps/tower/.env` or `.env.local`)

Seeded operators get `role = product_admin`, verified email, `early_access_granted_at` (for early-access gate testing), and a Better Auth `credential` account. Default password: **`codalyn-local-dev`**, or set **`TOWER_LOCAL_DEV_PASSWORD`**. Platform metering defaults come from migrations + `tower-limits-config.ts` on first use — not from this seed script.

**`pnpm db:seed:local`** runs step 4 only — useful after changing operator emails or refreshing dev passwords. Updates existing rows and resets their passwords.

Preview/production do **not** use these scripts. There, set `TOWER_PRODUCT_ADMIN_EMAILS` and rely on normal sign-up plus `syncProductAdminRolesFromEnv` on `/api/health` to promote existing users.

## Recommended flow

1. Change `auth-schema.ts`.
2. `pnpm db:generate` → review `drizzle/*.sql` → commit **all** generated artifacts:
   - `drizzle/NNNN_*.sql`
   - `drizzle/meta/_journal.json`
   - `drizzle/meta/NNNN_snapshot.json` (new snapshot for the migration)
3. `pnpm db:check` — validates journal ↔ SQL alignment, snapshot chain, and runs `drizzle-kit check`. **Required before opening a PR** when schema or migration files changed.
4. Locally: `pnpm db:migrate:local`, or `pnpm db:migrate` with `DATABASE_URL` set, or `pnpm db:push` (push skips migration history).
5. Remote: `pnpm db:migrate:dev` / `pnpm db:migrate:preview` / `pnpm db:migrate:prod` (Neon or Vercel variants) — see `.env.example` keys under **db:migrate**.
6. Deploy: **nothing runs migrations automatically** — not CI, not the Vercel build, not `vercel deploy`. A push to `main` deploys Tower from CI, so apply the migration to production (`pnpm db:migrate:prod -- --confirm`) and confirm with `pnpm db:migrate:status:prod` **before** pushing the commit that reads the new schema. Keep migrations additive so the still-running deployment survives the window (root `CLAUDE.md`, "Tower Deploy & Migration Rule").

## Journal integrity (agents and reviewers)

Drizzle tracks migration history in **`meta/_journal.json`** and per-migration **`meta/NNNN_snapshot.json`** files. These are **generated** — do not edit them by hand.

| Rule | Why |
| --- | --- |
| Always use **`db:generate`** after schema edits | Keeps SQL, journal entries, and snapshots in sync |
| Commit SQL + `meta/` in the **same commit** | Partial commits break deploys and teammate DBs |
| Run **`db:check`** before finishing | Catches missing journal entries, bad `idx`/`tag` prefixes, broken snapshot `prevId` chain |
| Never delete, rename, or reorder shipped migrations | Breaks databases that already applied them |
| Never hand-fix `_journal.json` or snapshots | Re-run `db:generate` from the current schema instead |
| Use **`db:push`** only for throwaway local iteration | Push does not update migration history for releases |

From the repo root: `pnpm app tower db:generate` and `pnpm app tower db:check`.

## Existing DB that was only ever `db:push`’d

The first `pnpm db:migrate` after migrations are introduced may fail with “already exists” if tables match the migration. Options: use a **fresh** database for a clean migrate (`pnpm db:reset:local -- --confirm` locally), or **baseline** the migration table per [Drizzle](https://orm.drizzle.team/docs/migrations) (record applied migrations without re-running SQL). Do not delete production data casually.
