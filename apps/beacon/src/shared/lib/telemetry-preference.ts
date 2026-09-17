/**
 * Local-device telemetry consent (Webflow Marketplace Privacy & Data Protection).
 * Telemetry is opt-in: nothing initializes or sends until the user explicitly grants consent
 * (first-run prompt or Settings → Privacy). Deliberately not synced to Tower — the preference
 * must apply before any network call and must work for guests without a Tower session.
 *
 * Storage only: applying the decision to the live SDK is `applyTelemetryConsent` in
 * init-observability.ts, the one module that touches posthog-js (flag-gated per build).
 */
const BEACON_TELEMETRY_CONSENT_KEY = "codalyn:beacon-telemetry-consent";

/** Pre-opt-in builds stored only an opt-out flag; honor it as an explicit denial. */
const LEGACY_TELEMETRY_OPT_OUT_KEY = "codalyn:beacon-telemetry-opt-out";

export type TelemetryConsent = "granted" | "denied";

/** `null` = never decided (first run) — the consent prompt should ask; telemetry stays off. */
export function readTelemetryConsent(): TelemetryConsent | null {
  try {
    const value = localStorage.getItem(BEACON_TELEMETRY_CONSENT_KEY);
    if (value === "granted" || value === "denied") {
      return value;
    }
    if (localStorage.getItem(LEGACY_TELEMETRY_OPT_OUT_KEY) === "1") {
      return "denied";
    }
    return null;
  } catch {
    return null;
  }
}

/** True only after an explicit opt-in. Undecided counts as disabled. */
export function isTelemetryGranted(): boolean {
  return readTelemetryConsent() === "granted";
}

/** Persists the decision on this device. */
export function setTelemetryConsent(consent: TelemetryConsent): void {
  try {
    localStorage.setItem(BEACON_TELEMETRY_CONSENT_KEY, consent);
    localStorage.removeItem(LEGACY_TELEMETRY_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}
