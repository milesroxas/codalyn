import type { ReactNode } from "react";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import { useCmsSlotsDrawerDismissBlocked } from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type CmsSlotDisplayNameDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fieldId: string;
  fieldLabel?: string;
  value: string;
  onValueChange: (value: string) => void;
  primaryLabel: string;
  primaryPending?: boolean;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  secondaryDisabled?: boolean;
  onSecondary?: () => void;
  trigger?: ReactNode;
};

export function CmsSlotDisplayNameDrawer(props: CmsSlotDisplayNameDrawerProps) {
  const {
    open,
    onOpenChange,
    title,
    fieldId,
    fieldLabel = "Slot name",
    value,
    onValueChange,
    primaryLabel,
    primaryPending = false,
    primaryDisabled = false,
    onPrimary,
    secondaryLabel,
    secondaryDisabled = false,
    onSecondary,
    trigger,
  } = props;

  const len = value.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : value.length;
  const dismissBlocked = useCmsSlotsDrawerDismissBlocked(primaryPending);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} interactionBlocked={dismissBlocked}>
      {trigger != null ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{title}</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              {fieldLabel}
            </Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {len}/{CMS_SLOT_ROW_NAME_MAX}
            </span>
          </div>
          <Input
            id={fieldId}
            value={value}
            maxLength={CMS_SLOT_ROW_NAME_MAX}
            onChange={(e) => onValueChange(e.target.value)}
            autoComplete="off"
            name="cms-slot-display-name"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <DrawerFooter className="gap-2">
          <Button
            type="button"
            className="w-full"
            disabled={primaryDisabled || primaryPending}
            onClick={() => void onPrimary()}
          >
            {primaryPending ? `${primaryLabel}…` : primaryLabel}
          </Button>
          {secondaryLabel != null ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={secondaryDisabled || primaryPending}
              onClick={() => (onSecondary != null ? onSecondary() : onOpenChange(false))}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
