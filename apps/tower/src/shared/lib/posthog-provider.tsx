"use client";

import { useConsentManager } from "@c15t/nextjs";
import { buildCodalynPostHogSuperProperties, resolvePostHogHost, resolvePostHogKey } from "@codalyn/observability";
import { PostHogProvider as PHProvider } from "@posthog/react";
import posthog from "posthog-js";
import { type ReactNode, useEffect, useState } from "react";
import { codalynRuntimeInfo } from "@/shared/lib/codalyn-runtime-info";

const posthogKey = resolvePostHogKey(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const posthogHost = resolvePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);

/**
 * PostHog is gated on the c15t "measurement" consent category: the SDK is
 * not initialized until consent is granted, and a later revocation opts the
 * loaded SDK out of capturing rather than unloading it.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const { has } = useConsentManager();
  const measurementAllowed = has("measurement");
  const [loaded, setLoaded] = useState(Boolean(posthog.__loaded));

  useEffect(() => {
    if (!posthogKey) {
      return;
    }

    if (!measurementAllowed) {
      if (posthog.__loaded && !posthog.has_opted_out_capturing()) {
        posthog.opt_out_capturing();
      }
      return;
    }

    if (posthog.__loaded) {
      if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing({ captureEventName: false });
      }
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    // A pre-consent opt-out persisted by a previous session survives init.
    if (posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing({ captureEventName: false });
    }
    posthog.register(
      buildCodalynPostHogSuperProperties({
        app: codalynRuntimeInfo.app,
        environment: codalynRuntimeInfo.environment,
        app_version: codalynRuntimeInfo.version,
      })
    );
    setLoaded(true);
  }, [measurementAllowed]);

  if (!posthogKey || !loaded) {
    return children;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
