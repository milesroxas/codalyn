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
      environment: buildCodalynSentryEnvironment("flint", buildInfo.channel),
      release: buildInfo.version,
      sendDefaultPii: false,
      tracesSampleRate: resolveCodalynSentryTracesSampleRate(buildInfo.channel),
      initialScope: {
        tags: buildCodalynSentryTags("flint", buildInfo.channel),
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
    posthog.register(
      buildCodalynPostHogSuperProperties({
        app: "flint",
        environment: buildInfo.channel,
        app_version: buildInfo.version,
        build_time: buildInfo.buildTime,
        bundle_recipient: buildInfo.recipient,
      })
    );
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
