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
import { readTelemetryOptOut } from "@/shared/lib/telemetry-preference";

const posthogKey = resolvePostHogKey(import.meta.env.VITE_POSTHOG_KEY);
const posthogHost = resolvePostHogHost(import.meta.env.VITE_POSTHOG_HOST);
const sentryDsn = resolveSentryDsn(import.meta.env.VITE_SENTRY_DSN);

export function initObservability(): void {
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: buildCodalynSentryEnvironment("beacon", buildInfo.channel),
      release: buildInfo.version,
      sendDefaultPii: false,
      tracesSampleRate: resolveCodalynSentryTracesSampleRate(buildInfo.channel),
      // Delivery-time gate so the settings opt-out applies without re-initializing the SDK.
      beforeSend: (event) => (readTelemetryOptOut() ? null : event),
      beforeSendTransaction: (event) => (readTelemetryOptOut() ? null : event),
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
      opt_out_capturing_by_default: readTelemetryOptOut(),
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    posthog.register(
      buildCodalynPostHogSuperProperties({
        app: "beacon",
        environment: buildInfo.channel,
        app_version: buildInfo.version,
        release_stage: buildInfo.releaseStage,
        build_time: buildInfo.buildTime,
        bundle_recipient: buildInfo.recipient,
      })
    );
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

export function captureObservabilityException(error: Error, context?: Record<string, unknown>): void {
  if (sentryDsn) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
  if (posthogKey) {
    posthog.captureException(error, context);
  }
}
