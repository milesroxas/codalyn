import {
  buildCodalynSentryEnvironment,
  buildCodalynSentryTags,
  resolveCodalynSentryTracesSampleRate,
  resolveSentryDsn,
} from "@codalyn/observability";
import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
import { codalynRuntimeInfo } from "@/shared/lib/codalyn-runtime-info";
import { scrubSentryEvent } from "@/shared/lib/sentry-scrub";

const dsn = resolveSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
const enabled = Boolean(dsn);

function baseOptions(): Pick<
  NodeOptions,
  "dsn" | "enabled" | "environment" | "release" | "tracesSampleRate" | "initialScope" | "sendDefaultPii" | "beforeSend"
> {
  return {
    dsn,
    enabled,
    // Explicit on every runtime: no IP/cookie/user PII by default, and the request context is scrubbed of
    // the Tower session bearer, cookies and bodies before an event leaves the process (compliance doc R8.22).
    sendDefaultPii: false,
    beforeSend: (event) => scrubSentryEvent(event),
    environment: buildCodalynSentryEnvironment(codalynRuntimeInfo.app, codalynRuntimeInfo.environment),
    release: codalynRuntimeInfo.version,
    tracesSampleRate: resolveCodalynSentryTracesSampleRate(codalynRuntimeInfo.environment),
    initialScope: {
      tags: buildCodalynSentryTags(codalynRuntimeInfo.app, codalynRuntimeInfo.environment),
    },
  };
}

export function getSentryServerInitOptions(): NodeOptions {
  return baseOptions();
}

export function getSentryEdgeInitOptions(): EdgeOptions {
  return baseOptions();
}

export function getSentryClientInitOptions(): BrowserOptions {
  return baseOptions();
}
