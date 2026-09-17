/**
 * Build-time release flags for the Webflow Marketplace bundle (round 8, 2026-09-17).
 *
 * Each flag selects a *reduced* form of a feature that review has repeatedly flagged, so the
 * Marketplace build ships the form whose acceptance criteria the review team spelled out. The
 * flags are resolved by Vite at build time (`define` in vite.config.ts) so the withheld code is
 * dead-code-eliminated from the shipped bundle — not merely hidden — and the release build refuses
 * the non-Marketplace value on release channels (`FORBIDDEN_RELEASE_ENV` in scripts/build-cli.mjs).
 *
 * | Flag                                    | Marketplace value | Effect of the other value                     |
 * | --------------------------------------- | ----------------- | --------------------------------------------- |
 * | `VITE_BEACON_TELEMETRY_ENABLED`         | unset / `false`   | `true` bundles posthog-js (opt-in, redacted)  |
 * | `VITE_BEACON_LOCALIZED_SITE_CMS_WRITES` | unset / `blocked` | `primary` writes the primary locale explicitly |
 *
 * Read the flags only through these helpers so tests can mock one module.
 */

/**
 * PostHog telemetry (opt-in analytics + error reporting). Off: the SDK is not bundled, no consent
 * prompt is shown, Settings → Privacy states that the build sends no telemetry, and the CSP carries
 * no telemetry host. On: the SDK initializes only after explicit consent and every event passes
 * through `redactBeaconTelemetryEvent` (`before_send`).
 *
 * Backed by the `__BEACON_TELEMETRY_ENABLED__` build constant rather than `import.meta.env` so the
 * `if (__BEACON_TELEMETRY_ENABLED__)` guards around the SDK import fold to `if (false)` and Rollup
 * drops the chunk entirely.
 */
export function isBeaconTelemetryEnabled(): boolean {
  return __BEACON_TELEMETRY_ENABLED__;
}

/**
 * What Beacon does with CMS item writes on a site that has secondary locales (Webflow Localization):
 * - `blocked` (Marketplace build): refuse the write before any request, with an in-app explanation.
 * - `primary`: write the primary locale with an explicit `cmsLocaleId` (never a secondary locale).
 *
 * Either way a write to a site without secondary locales still carries the primary `cmsLocaleId`
 * when the Data API exposes one, so no locale-aware request leaves without naming its locale.
 */
export type LocalizedSiteCmsWritePolicy = "blocked" | "primary";

export function resolveLocalizedSiteCmsWritePolicy(): LocalizedSiteCmsWritePolicy {
  return import.meta.env.VITE_BEACON_LOCALIZED_SITE_CMS_WRITES?.trim() === "primary" ? "primary" : "blocked";
}
