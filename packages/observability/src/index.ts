/** Codalyn apps that share one PostHog project and one Sentry project. */
export type CodalynApp = "tower" | "beacon" | "flint";

/** Shared PostHog project (Flint). Filter events by the `app` super property. */
export const CODALYN_POSTHOG_KEY = "phc_kJd34pP5g9zgEp8Q9dAIGnTx6vT8Vlafo2C3bzMfcR4";
export const CODALYN_POSTHOG_HOST = "https://us.i.posthog.com";

/** Shared Sentry project for all Codalyn apps. Filter issues by the `app` tag. */
export const CODALYN_SENTRY_DSN =
  "https://c993b67496005cf2368a92f96ea607e2@o4510105496584192.ingest.us.sentry.io/4510105587941376";

function isDisabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off";
}

/**
 * Resolve PostHog key. Env override wins when non-empty.
 * When unset or empty, uses the shared Codalyn project key.
 * Set to `0`, `false`, or `off` to disable tracking.
 */
export function resolvePostHogKey(override?: string): string | undefined {
  if (isDisabled(override)) {
    return undefined;
  }
  const value = override?.trim();
  return value || CODALYN_POSTHOG_KEY;
}

/**
 * Resolve Sentry DSN. Env override wins when non-empty.
 * When unset or empty, uses the shared Codalyn project DSN.
 * Set to `0`, `false`, or `off` to disable monitoring.
 */
export function resolveSentryDsn(override?: string): string | undefined {
  if (isDisabled(override)) {
    return undefined;
  }
  const value = override?.trim();
  return value || CODALYN_SENTRY_DSN;
}

export function resolvePostHogHost(override?: string): string {
  return override?.trim() || CODALYN_POSTHOG_HOST;
}
