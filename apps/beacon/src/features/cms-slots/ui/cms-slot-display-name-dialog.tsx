import type { ReactNode } from "react";
import { CmsSlotDisplayNameField } from "@/features/cms-slots/ui/cms-slot-display-name-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";

export type CmsSlotDisplayNameDialogProps = {
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

export function CmsSlotDisplayNameDialog(props: CmsSlotDisplayNameDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    fieldId,
    fieldLabel,
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

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !primaryPending && onOpenChange(nextOpen)}>
      {trigger != null ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>
        </AlertDialogHeader>
        <CmsSlotDisplayNameField
          fieldId={fieldId}
          fieldLabel={fieldLabel}
          value={value}
          onValueChange={onValueChange}
        />
        <AlertDialogFooter>
          {secondaryLabel != null ? (
            <AlertDialogCancel
              type="button"
              disabled={secondaryDisabled || primaryPending}
              onClick={() => (onSecondary != null ? onSecondary() : onOpenChange(false))}
            >
              {secondaryLabel}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction
            type="button"
            disabled={primaryDisabled || primaryPending}
            onClick={(event) => {
              event.preventDefault();
              void onPrimary();
            }}
          >
            {primaryPending ? `${primaryLabel}…` : primaryLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
