# Tower database (Drizzle)

Schema source: `src/shared/lib/db/auth-schema.ts`. Generated artifacts in this folder (`*.sql`, `meta/`) are committed so deploys and teammates apply the same history.

## Commands (run from `apps/tower` with `DATABASE_URL` set)

| Script | Use |
|--------|-----|
| `pnpm db:generate` | After **editing** `auth-schema.ts`, produces SQL + snapshot. **Commit** the diff. |
| `pnpm db:migrate` | Applies **pending** migrations (staging, production, CI, or local when you want parity with deploys). |
| `pnpm db:push` | **Dev-only** shortcut: sync schema to DB **without** new migration files. Fast iteration; do not rely on this alone for releases. |
| `pnpm db:check` | Validates migration files against snapshots (good for CI). |
| `pnpm db:studio` | Opens Drizzle Studio against `DATABASE_URL`. |

## Recommended flow

1. Change `auth-schema.ts`.
2. `pnpm db:generate` → review `drizzle/*.sql` → commit.
3. Locally: either `pnpm db:migrate` or `pnpm db:push` (push skips migration history).
4. Deploy / CI: `pnpm db:migrate` before or with app startup.

## Existing DB that was only ever `db:push`’d

The first `pnpm db:migrate` after migrations are introduced may fail with “already exists” if tables match the migration. Options: use a **fresh** database for a clean migrate, or **baseline** the migration table per [Drizzle](https://orm.drizzle.team/docs/migrations) (record applied migrations without re-running SQL). Do not delete production data casually.
