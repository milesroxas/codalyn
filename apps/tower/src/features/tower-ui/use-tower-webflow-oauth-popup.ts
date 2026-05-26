"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { notifyWebflowOAuthPopupResult } from "@/features/tower-ui/lib/tower-webflow-connection-toasts";
import {
  messageForWebflowOAuthAuthorizeError,
  parseWebflowOAuthAuthorizeError,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";

const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=700,scrollbars=yes,resizable=yes";

type WebflowOAuthMessage = {
  type?: string;
  status?: string;
  error?: string;
  detail?: string;
};

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

  const data = event.data as WebflowOAuthMessage | null;
  if (data?.type !== "codalyn:webflow-oauth") {
    return;
  }
  if (data.status === "success") {
    notifyWebflowOAuthPopupResult("success");
    for (const listener of webflowOAuthSuccessListeners) {
      listener();
    }
    return;
  }
  if (data.status === "error") {
    notifyWebflowOAuthPopupResult("error", data.error, data.detail);
  }
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
      toast.error(messageForWebflowOAuthAuthorizeError(error));
      return false;
    }
    window.open(data.url, "tower-webflow-oauth", WEBFLOW_OAUTH_POPUP_FEATURES);
    return true;
  }, []);

  return { openPopup };
}
