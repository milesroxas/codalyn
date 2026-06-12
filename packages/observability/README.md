# @codalyn/observability

Shared PostHog and Sentry configuration for all Codalyn apps. One PostHog project and one Sentry project; events are separated by **app** and **environment** metadata baked in at init time.

## Apps and environments

| Dimension | Values | Set by |
| --- | --- | --- |
| **App** | `tower`, `beacon`, `flint` | Hard-coded per app |
| **Environment** | `production`, `development`, `preview` | Build / deploy channel |

**Tower** — `VERCEL_ENV` on Vercel (`production` / `preview` / `development`); locally falls back to `NODE_ENV` (usually `development`).

**Beacon & Flint** — Vite `--mode` from the build CLI (`build:prod`, `build:preview`, `build:dev`).

## What gets sent

### Sentry

| Field | Example | Purpose |
| --- | --- | --- |
| `environment` | `beacon-production` | Primary filter in the Sentry Environment dropdown |
| Tag `app` | `beacon` | Filter by product |
| Tag `build_channel` | `production` | Filter one channel across all apps |
| `release` | `1.0.0` | Version from each app's `package.json` |

Trace sampling: `0.1` in production, `1.0` in development and preview.

### PostHog

Super properties on every event (via `posthog.register`):

| Property | Example | Notes |
| --- | --- | --- |
| `app` | `flint` | Required |
| `environment` | `preview` | Same values as Sentry `build_channel` |
| `app_version` | `1.0.0` | From `package.json` |
| `build_time` | ISO timestamp | Beacon & Flint only |
| `bundle_recipient` | `acme` | Extension builds only (build CLI recipient) |
| `release_stage` | `early-access` | Beacon only |

Beacon and Flint also attach PostHog **groups** for Webflow `site` and `workspace` after `webflow.getSiteInfo()` resolves.

## Configuration

Defaults live in `packages/observability/src/index.ts`. Apps call `resolvePostHogKey`, `resolvePostHogHost`, and `resolveSentryDsn` — when env vars are unset, the shared Codalyn project credentials are used.

Set a var to `0`, `false`, or `off` to disable that service locally.

### Per-app env vars

| App | PostHog | Sentry |
| --- | --- | --- |
| **Tower** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | `NEXT_PUBLIC_SENTRY_DSN` |
| **Beacon** | `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | `VITE_SENTRY_DSN` |
| **Flint** | `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | `VITE_SENTRY_DSN` |

See each app's `.env.example` for commented templates.

### Tower source maps (CI / Vercel)

Source map upload is configured in `apps/tower/next.config.ts` via `@sentry/nextjs`. Set these as **secrets** (never commit):

```bash
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

## Filtering in the dashboards

### PostHog

Use **Property filters** on super properties:

- One app, one env: `app = tower` AND `environment = production`
- All preview traffic: `environment = preview`
- One extension cohort: `app = beacon` AND `bundle_recipient = acme`

Save these as **Insights** or pin them on a dashboard for each app × environment you care about.

### Sentry

Use the **Environment** filter for a specific slice, e.g. `flint-preview`.

Cross-app filters on the Issues or Discover views:

- All production: `build_channel:production`
- One app: `app:beacon`

Suggested alert rules: one per `environment` value you ship (`tower-production`, `beacon-production`, etc.) so preview noise does not page production on-call.

## Code map

| Location | Role |
| --- | --- |
| `packages/observability/src/index.ts` | Shared keys, DSN, channel helpers, super-property builder |
| `apps/tower/src/shared/lib/codalyn-runtime-info.ts` | Tower app + channel + version |
| `apps/tower/src/shared/lib/sentry-init-options.ts` | Tower Sentry init |
| `apps/tower/src/shared/lib/posthog-provider.tsx` | Tower PostHog init |
| `apps/beacon/src/shared/lib/init-observability.ts` | Beacon Sentry + PostHog init |
| `apps/flint/src/shared/lib/init-observability.ts` | Flint Sentry + PostHog init |

To change tagging for all apps, update the helpers in `@codalyn/observability` and the three init sites above.
