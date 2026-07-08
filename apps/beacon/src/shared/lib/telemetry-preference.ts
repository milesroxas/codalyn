import posthog from "posthog-js";

/**
 * Local-device telemetry opt-out (Webflow Marketplace Privacy & Data Protection).
 * Deliberately not synced to Tower — the preference must apply before any network call
 * and must work for guests without a Tower session.
 */
const BEACON_TELEMETRY_OPT_OUT_KEY = "codalyn:beacon-telemetry-opt-out";

export function readTelemetryOptOut(): boolean {
  try {
    return localStorage.getItem(BEACON_TELEMETRY_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persists the preference and applies it to the live PostHog client immediately.
 * Sentry is gated at delivery time via `beforeSend`/`beforeSendTransaction` in
 * `init-observability`, which re-read this flag per event.
 */
export function setTelemetryOptOut(optOut: boolean): void {
  try {
    if (optOut) {
      localStorage.setItem(BEACON_TELEMETRY_OPT_OUT_KEY, "1");
    } else {
      localStorage.removeItem(BEACON_TELEMETRY_OPT_OUT_KEY);
    }
  } catch {
    /* ignore */
  }
  if (!posthog.__loaded) {
    return;
  }
  if (optOut) {
    posthog.opt_out_capturing();
  } else {
    posthog.opt_in_capturing({ captureEventName: null });
  }
}
