"use client";

import { buildCodalynPostHogSuperProperties, resolvePostHogHost, resolvePostHogKey } from "@codalyn/observability";
import { PostHogProvider as PHProvider } from "@posthog/react";
import posthog from "posthog-js";
import { type ReactNode, useEffect, useState } from "react";
import { codalynRuntimeInfo } from "@/shared/lib/codalyn-runtime-info";

const posthogKey = resolvePostHogKey(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const posthogHost = resolvePostHogHost(process.env.NEXT_PUBLIC_POSTHOG_HOST);

export function PostHogProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!posthogKey);

  useEffect(() => {
    if (!posthogKey || posthog.__loaded) {
      setReady(true);
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
    posthog.register(
      buildCodalynPostHogSuperProperties({
        app: codalynRuntimeInfo.app,
        environment: codalynRuntimeInfo.environment,
        app_version: codalynRuntimeInfo.version,
      })
    );
    setReady(true);
  }, []);

  if (!posthogKey || !ready) {
    return children;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
