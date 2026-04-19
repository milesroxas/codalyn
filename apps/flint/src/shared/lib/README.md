# shared/lib

Stateless utility modules shared across all features. No UI, no side effects, no store dependencies.

---

## build-info

**Path:** `@/shared/lib/build-info`

Exposes build-time constants injected by Vite at compile time. Used to tag PostHog events with runtime metadata so you can filter by version, channel, or build in analytics dashboards.

### Exports

```ts
import { buildInfo } from "@/shared/lib/build-info";

buildInfo.version    // e.g. "1.2.0"  — from package.json at build time
buildInfo.channel    // "production" | "development"  — from --mode flag
buildInfo.buildTime  // ISO 8601 timestamp  — e.g. "2026-02-27T10:30:00.000Z"
```

### How values are set

| Property | Source | Set by |
|---|---|---|
| `version` | `package.json → version` | `vite.config.ts` `define.__APP_VERSION__` |
| `channel` | Vite `--mode` flag | `build:prod` → `"production"`, `build:dev` → `"development"` |
| `buildTime` | `new Date().toISOString()` at build start | `vite.config.ts` `define.__BUILD_TIME__` |
| `recipient` | `VITE_BUNDLE_RECIPIENT` env var | Set by the build CLI from the interactive recipient prompt; falls back to `"internal"` at runtime if the variable is absent |

Recipient at build time comes from the shared root build CLI (see repository root README); it sets `VITE_BUNDLE_RECIPIENT` so PostHog can tag cohorts by distribution target.

### PostHog integration

Registered as [super properties](https://posthog.com/docs/libraries/js#super-properties) in `src/index.tsx` — automatically attached to every PostHog event without any extra instrumentation:

```ts
posthog.register({
  app_version: buildInfo.version,
  build_channel: buildInfo.channel,
  build_time: buildInfo.buildTime,
});
```

---

## stable-json

**Path:** `@/shared/lib/stable-json`

Deterministic JSON serialization — keys are sorted before stringifying. Used wherever JSON output must be stable across runs (e.g. cache keys, diff comparisons).
