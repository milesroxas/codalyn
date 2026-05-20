import * as Sentry from "@sentry/nextjs";
import { getSentryClientInitOptions } from "@/shared/lib/sentry-init-options";

Sentry.init(getSentryClientInitOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
