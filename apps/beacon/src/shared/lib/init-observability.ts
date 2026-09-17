import type { PostHog } from "posthog-js";
import { buildInfo } from "@/shared/lib/build-info";
import { redactBeaconTelemetryEvent } from "@/shared/lib/telemetry-event-redaction";
import { isTelemetryGranted, setTelemetryConsent, type TelemetryConsent } from "@/shared/lib/telemetry-preference";

/**
 * Opt-in telemetry (Webflow Marketplace Privacy & Data Protection), flag-gated for the Marketplace
 * build (review round 8, 2026-09-17).
 *
 * `__BEACON_TELEMETRY_ENABLED__` is a build constant (vite.config.ts, `VITE_BEACON_TELEMETRY_ENABLED`).
 * Off — every Marketplace bundle — the guarded dynamic imports below fold away, so posthog-js and the
 * shared observability constants are not in the shipped zip at all (the release build forbids any
 * "posthog" trace), and every export here is a no-op. On, the SDK is still not initialized — no
 * telemetry network traffic at all — until the user has explicitly granted consent via the first-run
 * prompt or Settings → Privacy, and every event passes through {@link redactBeaconTelemetryEvent}
 * (`before_send`) before it leaves.
 *
 * This module is the only place that touches the SDK: consent changes, product events and exception
 * reports all go through the exported functions, so the gate and the redaction cannot be bypassed.
 *
 * PostHog is the only telemetry processor in the Designer Extension bundle — it carries both product
 * analytics and error reporting (`capture_exceptions`). The Sentry browser SDK is deliberately absent:
 * its transport probes native `fetch` through a hidden sandbox iframe, and Marketplace guidelines bar
 * iframe creation outside the approved OAuth flow.
 */

let observabilityStarted = false;
/** The initialized SDK, once consent has been granted and the client has loaded. */
let client: PostHog | null = null;

async function startPostHog(): Promise<void> {
  // Guarded again here (not only in the caller) so the dynamic imports sit inside a branch Rollup can
  // prove dead when the flag is off.
  if (!__BEACON_TELEMETRY_ENABLED__) {
    return;
  }
  const [{ default: posthog }, observability] = await Promise.all([
    import("posthog-js"),
    import("@codalyn/observability"),
  ]);
  const posthogKey = observability.resolvePostHogKey(import.meta.env.VITE_POSTHOG_KEY);
  if (!posthogKey) {
    return;
  }
  // Consent may have been withdrawn while the chunk was loading.
  if (!isTelemetryGranted()) {
    observabilityStarted = false;
    return;
  }

  posthog.init(posthogKey, {
    api_host: observability.resolvePostHogHost(import.meta.env.VITE_POSTHOG_HOST),
    // Spread last: the shared constant is the privacy floor for extension bundles, so it must win over
    // anything set above it rather than being silently overridden by an app-local option.
    ...observability.CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    // Application-level redaction on every outgoing event: URLs, paths, referrers and page titles are
    // dropped; message payloads and stack-frame locations are scrubbed (telemetry-event-redaction.ts).
    before_send: redactBeaconTelemetryEvent,
  });
  posthog.register({
    ...observability.buildCodalynPostHogSuperProperties({
      app: "beacon",
      environment: buildInfo.channel,
      app_version: buildInfo.version,
      release_stage: buildInfo.releaseStage,
      build_time: buildInfo.buildTime,
      bundle_recipient: buildInfo.recipient,
    }),
    // PostHog would otherwise derive coarse location from the client IP server-side; the
    // in-app disclosure says no location is collected (and Webflow's developer ToS bars
    // gathering end-user locations), so suppress GeoIP enrichment on every event.
    $geoip_disable: true,
  });
  client = posthog;

  const siteInfo = await webflow.getSiteInfo();
  posthog.group("site", siteInfo.siteId, {
    name: siteInfo.siteName,
    short_name: siteInfo.shortName,
  });
  posthog.group("workspace", siteInfo.workspaceId, {
    slug: siteInfo.workspaceSlug,
  });
}

/**
 * Starts the SDK when (and only when) this build bundles it and the user has granted consent. Safe
 * to call repeatedly; used both at boot and when consent is granted mid-session.
 */
export function initObservability(): void {
  if (!__BEACON_TELEMETRY_ENABLED__ || observabilityStarted || !isTelemetryGranted()) {
    return;
  }
  observabilityStarted = true;
  void startPostHog().catch(() => {
    observabilityStarted = false;
  });
}

/** Records the user's decision and applies it: a grant starts the SDK held back at boot, a denial stops capture. */
export function applyTelemetryConsent(consent: TelemetryConsent): void {
  setTelemetryConsent(consent);
  if (consent === "granted") {
    client?.opt_in_capturing({ captureEventName: null });
    initObservability();
    return;
  }
  client?.opt_out_capturing();
}

/** Reports a handled exception (e.g. from the error boundary); no-op before consent or in telemetry-off builds. */
export function captureObservabilityException(error: Error, context?: Record<string, unknown>): void {
  client?.captureException(error, context);
}

/**
 * Records a product event; no-op before consent or in telemetry-off builds. Callers must keep to the
 * disclosed field list — never PII or free text.
 */
export function captureObservabilityEvent(name: string, properties?: Record<string, unknown>): void {
  client?.capture(name, properties);
}

/** True once the SDK is initialized and capturing (consent granted, chunk loaded). */
export function isObservabilityActive(): boolean {
  return client !== null;
}

/** Test seam only. */
export function resetObservabilityForTests(): void {
  observabilityStarted = false;
  client = null;
}
