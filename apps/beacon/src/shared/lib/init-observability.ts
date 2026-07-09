import {
  buildCodalynPostHogSuperProperties,
  buildCodalynSentryEnvironment,
  buildCodalynSentryTags,
  CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS,
  resolveCodalynSentryTracesSampleRate,
  resolvePostHogHost,
  resolvePostHogKey,
  resolveSentryDsn,
} from "@codalyn/observability";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import { buildInfo } from "@/shared/lib/build-info";
import { isTelemetryGranted, setTelemetryConsent, type TelemetryConsent } from "@/shared/lib/telemetry-preference";

const posthogKey = resolvePostHogKey(import.meta.env.VITE_POSTHOG_KEY);
const posthogHost = resolvePostHogHost(import.meta.env.VITE_POSTHOG_HOST);
const sentryDsn = resolveSentryDsn(import.meta.env.VITE_SENTRY_DSN);

let observabilityStarted = false;

/**
 * Opt-in telemetry (Webflow Marketplace Privacy & Data Protection): the SDKs are not initialized —
 * no PostHog or Sentry network traffic at all — until the user has explicitly granted consent via
 * the first-run prompt or Settings → Privacy. Safe to call repeatedly; used both at boot and when
 * consent is granted mid-session.
 */
export function initObservability(): void {
  if (observabilityStarted || !isTelemetryGranted()) {
    return;
  }
  observabilityStarted = true;

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: buildCodalynSentryEnvironment("beacon", buildInfo.channel),
      release: buildInfo.version,
      sendDefaultPii: false,
      tracesSampleRate: resolveCodalynSentryTracesSampleRate(buildInfo.channel),
      // Delivery-time gate so a mid-session opt-out applies without re-initializing the SDK.
      beforeSend: (event) => (isTelemetryGranted() ? event : null),
      beforeSendTransaction: (event) => (isTelemetryGranted() ? event : null),
      initialScope: {
        tags: buildCodalynSentryTags("beacon", buildInfo.channel),
      },
    });
  }

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      ...CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    posthog.register({
      ...buildCodalynPostHogSuperProperties({
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
  }

  if (!posthogKey) {
    return;
  }

  void webflow.getSiteInfo().then((siteInfo) => {
    posthog.group("site", siteInfo.siteId, {
      name: siteInfo.siteName,
      short_name: siteInfo.shortName,
    });
    posthog.group("workspace", siteInfo.workspaceId, {
      slug: siteInfo.workspaceSlug,
    });
  });
}

/** Records the user's decision and, on a grant, starts the SDKs that were held back at boot. */
export function applyTelemetryConsent(consent: TelemetryConsent): void {
  setTelemetryConsent(consent);
  if (consent === "granted") {
    initObservability();
  }
}

export function captureObservabilityException(error: Error, context?: Record<string, unknown>): void {
  if (!observabilityStarted) {
    return;
  }
  if (sentryDsn) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
  if (posthogKey) {
    posthog.captureException(error, context);
  }
}
