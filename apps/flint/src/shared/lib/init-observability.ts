import { resolvePostHogHost, resolvePostHogKey, resolveSentryDsn } from "@codalyn/observability";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import { getCurrentPreset } from "@/features/linter/model/linter.factory";
import { identifySiteGroup, identifyWorkspaceGroup, registerFrameworkPreset } from "@/shared/lib/analytics";
import { buildInfo } from "@/shared/lib/build-info";

const posthogKey = resolvePostHogKey(import.meta.env.VITE_POSTHOG_KEY);
const posthogHost = resolvePostHogHost(import.meta.env.VITE_POSTHOG_HOST);
const sentryDsn = resolveSentryDsn(import.meta.env.VITE_SENTRY_DSN);

export function initObservability(): void {
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: buildInfo.channel,
      release: buildInfo.version,
      tracesSampleRate: buildInfo.channel === "production" ? 0.1 : 1,
      initialScope: {
        tags: { app: "flint" },
      },
    });
  }

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    posthog.register({
      app: "flint",
      app_version: buildInfo.version,
      build_channel: buildInfo.channel,
      build_time: buildInfo.buildTime,
      bundle_recipient: buildInfo.recipient,
    });
    registerFrameworkPreset(getCurrentPreset());
  }

  if (!posthogKey) {
    return;
  }

  void webflow.getSiteInfo().then((siteInfo) => {
    identifySiteGroup({
      siteId: siteInfo.siteId,
      siteName: siteInfo.siteName,
      shortName: siteInfo.shortName,
    });
    identifyWorkspaceGroup({
      workspaceId: siteInfo.workspaceId,
      workspaceSlug: siteInfo.workspaceSlug,
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
