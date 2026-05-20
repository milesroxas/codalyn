import * as Sentry from "@sentry/nextjs";
import { getSentryServerInitOptions } from "@/shared/lib/sentry-init-options";

Sentry.init(getSentryServerInitOptions());
