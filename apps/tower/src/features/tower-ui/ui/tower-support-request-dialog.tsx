"use client";

import {
  TOWER_SUPPORT_REQUEST_CONFIG,
  type TowerSupportRequestKind,
} from "@/features/tower-ui/lib/tower-support-request";
import { TowerSupportRequestForm } from "@/features/tower-ui/ui/tower-support-request-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

type TowerSupportRequestDialogProps = {
  kind: TowerSupportRequestKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TowerSupportRequestDialog({ kind, open, onOpenChange }: TowerSupportRequestDialogProps) {
  const config = TOWER_SUPPORT_REQUEST_CONFIG[kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <TowerSupportRequestForm
          kind={kind}
          variant="dialog"
          onSuccess={() => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
