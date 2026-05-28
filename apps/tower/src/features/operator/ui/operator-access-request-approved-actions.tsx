"use client";

import { IconCopy, IconMailForward } from "@tabler/icons-react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import {
  earlyAccessRequestApprovalUrl,
  OPERATOR_ACCESS_REQUEST_COPY_LINK_ERROR,
  OPERATOR_ACCESS_REQUEST_COPY_LINK_LABEL,
  OPERATOR_ACCESS_REQUEST_COPY_LINK_SUCCESS,
  OPERATOR_ACCESS_REQUEST_RESEND_ERROR,
  OPERATOR_ACCESS_REQUEST_RESEND_LABEL,
  OPERATOR_ACCESS_REQUEST_RESEND_SUCCESS,
} from "@/features/operator/lib/operator-access-request-copy";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";

export function OperatorAccessRequestApprovedActions(props: {
  requestId: string;
  busy: boolean;
  onBusyChange: (requestId: string | null) => void;
}) {
  const { requestId, busy, onBusyChange } = props;

  async function runAction(action: "resend_approval" | "invite_link", successMessage: string) {
    onBusyChange(requestId);
    try {
      const res = await operatorApi.resolveEarlyAccessRequest(requestId, action);
      if (action === "invite_link") {
        const url = earlyAccessRequestApprovalUrl(res);
        if (!url) {
          toast.error(OPERATOR_ACCESS_REQUEST_COPY_LINK_ERROR);
          return;
        }
        await navigator.clipboard.writeText(url);
        toast.success(OPERATOR_ACCESS_REQUEST_COPY_LINK_SUCCESS);
        return;
      }
      toast.success(successMessage);
    } catch (err) {
      const fallback =
        action === "resend_approval" ? OPERATOR_ACCESS_REQUEST_RESEND_ERROR : OPERATOR_ACCESS_REQUEST_COPY_LINK_ERROR;
      toast.error(err instanceof OperatorApiError ? err.message : fallback);
    } finally {
      onBusyChange(null);
    }
  }

  return (
    <ButtonGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void runAction("resend_approval", OPERATOR_ACCESS_REQUEST_RESEND_SUCCESS)}
      >
        <IconMailForward aria-hidden data-icon="inline-start" />
        {OPERATOR_ACCESS_REQUEST_RESEND_LABEL}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void runAction("invite_link", OPERATOR_ACCESS_REQUEST_COPY_LINK_SUCCESS)}
      >
        <IconCopy aria-hidden data-icon="inline-start" />
        {OPERATOR_ACCESS_REQUEST_COPY_LINK_LABEL}
      </Button>
    </ButtonGroup>
  );
}
