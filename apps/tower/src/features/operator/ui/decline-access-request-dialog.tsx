"use client";

import {
  OPERATOR_ACCESS_REQUEST_DECLINE_CANCEL_LABEL,
  OPERATOR_ACCESS_REQUEST_DECLINE_CONFIRM_LABEL,
  OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_DESCRIPTION,
  OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_TITLE,
  OPERATOR_ACCESS_REQUEST_DECLINE_REASON_LABEL,
  OPERATOR_ACCESS_REQUEST_DECLINE_REASON_PLACEHOLDER,
} from "@/features/operator/lib/operator-access-request-copy";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export type DeclineAccessRequestTarget = {
  id: string;
  email: string;
};

export function DeclineAccessRequestDialog(props: {
  target: DeclineAccessRequestTarget | null;
  declineReason: string;
  busy: boolean;
  onDeclineReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirmDecline: (requestId: string, declineReason: string) => void;
}) {
  const { target, declineReason, busy, onDeclineReasonChange, onOpenChange, onConfirmDecline } = props;
  const trimmedReason = declineReason.trim();
  const canConfirm = trimmedReason.length > 0;

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent size="form" showCloseButton>
        <DialogHeader>
          <DialogTitle>{OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>
            {target ? (
              <>
                {OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_DESCRIPTION} Request from{" "}
                <span className="font-medium">{target.email}</span>.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="access-request-decline-reason">{OPERATOR_ACCESS_REQUEST_DECLINE_REASON_LABEL}</Label>
          <Textarea
            id="access-request-decline-reason"
            fieldSize="lg"
            placeholder={OPERATOR_ACCESS_REQUEST_DECLINE_REASON_PLACEHOLDER}
            value={declineReason}
            onChange={(event) => onDeclineReasonChange(event.target.value)}
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {OPERATOR_ACCESS_REQUEST_DECLINE_CANCEL_LABEL}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !canConfirm}
            onClick={() => {
              if (!target || !canConfirm) {
                return;
              }
              onConfirmDecline(target.id, trimmedReason);
            }}
          >
            {OPERATOR_ACCESS_REQUEST_DECLINE_CONFIRM_LABEL}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
