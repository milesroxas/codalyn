"use client";

import { toast } from "sonner";
import {
  messageForWebflowOAuthCallbackError,
  TOWER_WEBFLOW_CONNECTED_TOAST,
  TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST,
  type TowerWebflowQueryStatus,
  towerWebflowQueryStatusCopy,
} from "@/features/tower-ui/lib/tower-workspace-onboarding";

export function notifyWebflowOAuthPopupError(error?: string): void {
  toast.error(messageForWebflowOAuthCallbackError(error));
}

export function notifyWebflowOAuthAuthorizeFailure(message: string): void {
  toast.error(message);
}

export function notifyWebflowConnectionQueryStatus(
  status: TowerWebflowQueryStatus,
  webflowOAuthConnected: boolean
): void {
  if (status === "connected") {
    if (webflowOAuthConnected) {
      toast.success(TOWER_WEBFLOW_CONNECTED_TOAST.title, {
        description: TOWER_WEBFLOW_CONNECTED_TOAST.description,
      });
      return;
    }
    toast.error(TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST.title, {
      description: TOWER_WEBFLOW_CONNECTION_NOT_SAVED_TOAST.description,
    });
    return;
  }

  const copy = towerWebflowQueryStatusCopy(status);
  toast.error(copy.title, { description: copy.description });
}
