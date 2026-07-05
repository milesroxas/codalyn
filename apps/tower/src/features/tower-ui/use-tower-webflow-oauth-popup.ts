"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  notifyWebflowOAuthAuthorizeFailure,
  notifyWebflowOAuthPopupError,
} from "@/features/tower-ui/lib/tower-webflow-connection-toasts";
import {
  messageForWebflowOAuthAuthorizeError,
  parseWebflowOAuthAuthorizeError,
  parseWebflowOAuthPostMessage,
  TOWER_WEBFLOW_POPUP_BLOCKED_MESSAGE,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";
import {
  TOWER_CONNECTION_PATH,
  TOWER_CONNECTION_STATUS_QUERY,
  towerConnectionPathWithStatus,
} from "@/shared/lib/navigation/tower-app-paths";

const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=700,scrollbars=yes,resizable=yes";

function isTrustedOAuthMessageOrigin(origin: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return origin === window.location.origin;
}

const webflowOAuthSuccessListeners = new Set<() => void>();
let webflowOAuthMessageListenerAttached = false;
// Next's app router is a stable singleton, so the latest hook instance can safely share it
// with the module-level message listener.
let webflowOAuthRouter: ReturnType<typeof useRouter> | null = null;

function connectionPathWithConnectedStatus(): string {
  const url = new URL(window.location.href);
  if (url.pathname !== TOWER_CONNECTION_PATH) {
    return towerConnectionPathWithStatus("connected");
  }
  // Already on the connection page (possibly extension-scoped): keep `siteId`/`app` params.
  url.searchParams.set(TOWER_CONNECTION_STATUS_QUERY, "connected");
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function handleWebflowOAuthMessage(event: MessageEvent): void {
  if (!isTrustedOAuthMessageOrigin(event.origin)) {
    return;
  }

  const message = parseWebflowOAuthPostMessage(event.data);
  if (!message) {
    return;
  }
  if (message.status === "success") {
    for (const listener of webflowOAuthSuccessListeners) {
      listener();
    }
    // No toast here: the connection page owns success/failure notification via the
    // `?connection=` status query, after verifying the saved connection server-side.
    const target = connectionPathWithConnectedStatus();
    if (webflowOAuthRouter) {
      webflowOAuthRouter.push(target);
      // Queued after the navigation: shared layouts are not re-rendered by push, so refetch
      // the destination tree or the layout onboarding banner keeps its stale "connect" state.
      webflowOAuthRouter.refresh();
    } else {
      window.location.assign(target);
    }
    return;
  }
  notifyWebflowOAuthPopupError(message.error);
}

function ensureWebflowOAuthMessageListener(): void {
  if (webflowOAuthMessageListenerAttached || typeof window === "undefined") {
    return;
  }
  webflowOAuthMessageListenerAttached = true;
  window.addEventListener("message", handleWebflowOAuthMessage);
}

export function useTowerWebflowOAuthPopup(onSuccess?: () => void) {
  const router = useRouter();

  useEffect(() => {
    ensureWebflowOAuthMessageListener();
    webflowOAuthRouter = router;
    if (!onSuccess) {
      return;
    }
    webflowOAuthSuccessListeners.add(onSuccess);
    return () => {
      webflowOAuthSuccessListeners.delete(onSuccess);
    };
  }, [onSuccess, router]);

  const openPopup = useCallback(async (): Promise<boolean> => {
    // Connect the app named in the page URL (`?app=flint`), default Beacon. Lets the same Tower web
    // connect screen serve a Flint connect (opened from the Flint extension) without prop-drilling.
    const appParam = new URLSearchParams(window.location.search).get("app");
    const authorizeUrl =
      appParam === "flint" ? "/api/integrations/webflow/authorize?app=flint" : "/api/integrations/webflow/authorize";
    const res = await fetch(authorizeUrl, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      const error = parseWebflowOAuthAuthorizeError(res.status, data);
      notifyWebflowOAuthAuthorizeFailure(messageForWebflowOAuthAuthorizeError(error));
      return false;
    }
    const popup = window.open(data.url, "tower-webflow-oauth", WEBFLOW_OAUTH_POPUP_FEATURES);
    if (!popup) {
      notifyWebflowOAuthAuthorizeFailure(TOWER_WEBFLOW_POPUP_BLOCKED_MESSAGE);
      return false;
    }
    return true;
  }, []);

  return { openPopup };
}
