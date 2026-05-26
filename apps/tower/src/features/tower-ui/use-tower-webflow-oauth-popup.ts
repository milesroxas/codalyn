"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  messageForWebflowOAuthAuthorizeError,
  parseWebflowOAuthAuthorizeError,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";

const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=700,scrollbars=yes,resizable=yes";

type WebflowOAuthMessage = {
  type?: string;
  status?: string;
};

function isTrustedOAuthMessageOrigin(origin: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return origin === window.location.origin;
}

export function useTowerWebflowOAuthPopupListener(onSuccess?: () => void) {
  useEffect(() => {
    if (!onSuccess) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (!isTrustedOAuthMessageOrigin(event.origin)) {
        return;
      }

      const data = event.data as WebflowOAuthMessage | null;
      if (data?.type !== "codalyn:webflow-oauth") {
        return;
      }
      if (data.status === "success") {
        onSuccess?.();
        return;
      }
      if (data.status === "error") {
        toast.error("Webflow authorization was cancelled or failed.");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess]);
}

export function useTowerWebflowOAuthPopup(onSuccess?: () => void) {
  useTowerWebflowOAuthPopupListener(onSuccess);

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
