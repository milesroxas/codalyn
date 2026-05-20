import { resolveSentryDsn } from "@codalyn/observability";
import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";

const dsn = resolveSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
const enabled = Boolean(dsn);

function baseOptions(): Pick<NodeOptions, "dsn" | "enabled" | "environment" | "tracesSampleRate" | "initialScope"> {
  return {
    dsn,
    enabled,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
    initialScope: {
      tags: { app: "tower" },
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
