import {
  buildCodalynSentryEnvironment,
  buildCodalynSentryTags,
  resolveCodalynSentryTracesSampleRate,
  resolveSentryDsn,
} from "@codalyn/observability";
import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
import { codalynRuntimeInfo } from "@/shared/lib/codalyn-runtime-info";

const dsn = resolveSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
const enabled = Boolean(dsn);

function baseOptions(): Pick<
  NodeOptions,
  "dsn" | "enabled" | "environment" | "release" | "tracesSampleRate" | "initialScope"
> {
  return {
    dsn,
    enabled,
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
