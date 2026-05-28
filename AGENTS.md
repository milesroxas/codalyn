# Codalyn monorepo — agent guide

Persistent instructions for AI agents (Cursor and similar) live in **`.cursor/rules/`** (`alwaysApply: true`). They apply to **every prompt** in this repository.

| Rule file | Purpose |
| --- | --- |
| `quality-gates.mdc` | Run Biome lint + TypeScript typecheck; fix all errors and warnings before done |
| `code-quality.mdc` | DRY, single source of truth, no hacks; FSD and package boundaries |
| `security.mdc` | Extra scrutiny for auth, secrets, APIs, and user data |
| `runtime-value-shape-safety.mdc` | Normalize external/runtime data at integration boundaries |

## Verify commands (match CI)

From the repo root:

```bash
pnpm install          # if dependencies changed
pnpm lint             # turbo → biome check per package
pnpm typecheck        # turbo → tsc --noEmit per package
pnpm verify           # lint + typecheck (same graph as CI lint/typecheck step)
```

Scoped to one app:

```bash
pnpm app <flint|beacon|tower> lint
pnpm app <flint|beacon|tower> typecheck
```

Use **pnpm** only (`packageManager` in root `package.json`).

## Monorepo constraints

- Apps: `apps/flint`, `apps/beacon`, `apps/tower` — **no imports between apps**.
- Shared code: `packages/loadout`, `packages/webflow-kit`, `packages/observability`.
- Workspace layout and commands: root `README.md`.

## UI styling ownership (always enforce)

- Do not style shared components at call sites.
- When a new look is needed, update or extend the component variant/API at the owning primitive (typically under `shared/ui`), then consume the variant.
- Allow call-site overrides only when absolutely necessary for non-visual layout placement that cannot be expressed in the primitive without harming reuse.
- Treat call-site visual styling as a DRY/single-source-of-truth violation and refactor before considering work complete.

## App-specific guides

| App | Extra agent context |
| --- | --- |
| Beacon | `apps/beacon/AGENTS.md` (Webflow Designer API), `apps/beacon/.cursor/rules/beacon.mdc` |
| Tower | `apps/tower/README.md` (dashboard, DB, Docker), `apps/tower/drizzle/README.md` (migrations), `apps/tower/.cursor/rules/tower.mdc` |
| Flint | `apps/flint/README.md` |

When app docs conflict with repo-wide `.cursor/rules/`, **repo-wide rules win** for quality gates, DRY, and security.
