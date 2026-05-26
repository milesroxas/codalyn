# Tower database (Drizzle)

Schema source: `src/shared/lib/db/auth-schema.ts`. Generated artifacts in this folder (`*.sql`, `meta/`) are committed so deploys and teammates apply the same history.

## Commands (run from `apps/tower` with `DATABASE_URL` set)

| Script | Use |
|--------|-----|
| `pnpm db:generate` | After **editing** `auth-schema.ts`, produces SQL + snapshot. **Commit** the diff. |
| `pnpm db:migrate` | Applies **pending** migrations when `DATABASE_URL` is already set (CI, ad hoc). |
| `pnpm db:migrate:local` | Same as migrate using **only** `apps/tower/.env` + `.env.local` (clears shell `DATABASE_URL`). |
| `pnpm db:migrate:dev` / `:preview` / `:prod` | Resolves URL via **Neon CLI** (`NEON_PROJECT_ID`, `NEON_API_KEY`, `TOWER_NEON_BRANCH_*`) or optional gitignored `TOWER_DATABASE_URL_*`. **`prod` requires `--confirm`** (or `TOWER_DB_MIGRATE_CONFIRM=1`). |
| `pnpm db:migrate:*:vercel` | **`vercel env pull`** only — ignores local `TOWER_*` overrides. Requires linked `apps/tower/.vercel`. |
| `pnpm db:push` | **Dev-only** shortcut: sync schema to DB **without** new migration files. Fast iteration; do not rely on this alone for releases. |
| `pnpm db:check` | Validates migration files against snapshots (good for CI). |
| `pnpm db:beacon-preset-storage-migrate:local` | One-time JSON cleanup for legacy Beacon preset keys in `beacon_app_settings.payload` and `organization.beacon_team_settings`. Add `--dry-run` to preview. |
| `pnpm db:beacon-preset-storage-migrate:dev` / `:prod` | Same data migration against remote DB (Neon / Vercel env variants mirror `db:migrate`). |
| `pnpm db:studio` | Opens Drizzle Studio against `DATABASE_URL`. |

## Recommended flow

1. Change `auth-schema.ts`.
2. `pnpm db:generate` → review `drizzle/*.sql` → commit.
3. Locally: `pnpm db:migrate:local`, or `pnpm db:migrate` with `DATABASE_URL` set, or `pnpm db:push` (push skips migration history).
4. Remote: `pnpm db:migrate:dev` / `pnpm db:migrate:preview` / `pnpm db:migrate:prod` (Neon or Vercel variants) — see `.env.example` keys under **db:migrate**.
5. Deploy / CI: `pnpm db:migrate` with `DATABASE_URL` before or with app startup.

## Existing DB that was only ever `db:push`’d

The first `pnpm db:migrate` after migrations are introduced may fail with “already exists” if tables match the migration. Options: use a **fresh** database for a clean migrate, or **baseline** the migration table per [Drizzle](https://orm.drizzle.team/docs/migrations) (record applied migrations without re-running SQL). Do not delete production data casually.
