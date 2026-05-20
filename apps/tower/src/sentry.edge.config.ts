import * as Sentry from "@sentry/nextjs";
import { getSentryEdgeInitOptions } from "@/shared/lib/sentry-init-options";

Sentry.init(getSentryEdgeInitOptions());
