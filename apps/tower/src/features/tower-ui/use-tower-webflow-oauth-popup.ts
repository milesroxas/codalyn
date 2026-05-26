"use client";

import { useCallback, useEffect } from "react";
import {
  notifyWebflowOAuthAuthorizeFailure,
  notifyWebflowOAuthPopupResult,
} from "@/features/tower-ui/lib/tower-webflow-connection-toasts";
import {
  messageForWebflowOAuthAuthorizeError,
  parseWebflowOAuthAuthorizeError,
  parseWebflowOAuthPostMessage,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";

const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=700,scrollbars=yes,resizable=yes";

function isTrustedOAuthMessageOrigin(origin: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return origin === window.location.origin;
}

const webflowOAuthSuccessListeners = new Set<() => void>();
let webflowOAuthMessageListenerAttached = false;

function handleWebflowOAuthMessage(event: MessageEvent): void {
  if (!isTrustedOAuthMessageOrigin(event.origin)) {
    return;
  }

  const message = parseWebflowOAuthPostMessage(event.data);
  if (!message) {
    return;
  }
  if (message.status === "success") {
    notifyWebflowOAuthPopupResult("success");
    for (const listener of webflowOAuthSuccessListeners) {
      listener();
    }
    return;
  }
  notifyWebflowOAuthPopupResult("error", message.error);
}

function ensureWebflowOAuthMessageListener(): void {
  if (webflowOAuthMessageListenerAttached || typeof window === "undefined") {
    return;
  }
  webflowOAuthMessageListenerAttached = true;
  window.addEventListener("message", handleWebflowOAuthMessage);
}

export function useTowerWebflowOAuthPopup(onSuccess?: () => void) {
  useEffect(() => {
    ensureWebflowOAuthMessageListener();
    if (!onSuccess) {
      return;
    }
    webflowOAuthSuccessListeners.add(onSuccess);
    return () => {
      webflowOAuthSuccessListeners.delete(onSuccess);
    };
  }, [onSuccess]);

  const openPopup = useCallback(async (): Promise<boolean> => {
    const res = await fetch("/api/integrations/webflow/authorize", {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      const error = parseWebflowOAuthAuthorizeError(res.status, data);
      notifyWebflowOAuthAuthorizeFailure(messageForWebflowOAuthAuthorizeError(error));
      return false;
    }
    window.open(data.url, "tower-webflow-oauth", WEBFLOW_OAUTH_POPUP_FEATURES);
    return true;
  }, []);

  return { openPopup };
}
