import {
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CANCEL,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CONFIRM,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_DESCRIPTION,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { ConfirmDestructiveDialog } from "@/shared/ui/confirm-destructive-dialog";

export type ComposerRemoveDraftDialogProps = {
  open: boolean;
  componentName: string | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ComposerRemoveDraftDialog(props: ComposerRemoveDraftDialogProps) {
  const { open, componentName, busy, onOpenChange, onConfirm } = props;

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={componentName != null ? `Remove ${componentName}?` : CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_TITLE}
      description={CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_DESCRIPTION}
      cancelLabel={CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CANCEL}
      confirmLabel={CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CONFIRM}
      onConfirm={onConfirm}
    />
  );
}
