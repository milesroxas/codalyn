import {
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CANCEL,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CONFIRM,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_DESCRIPTION,
  CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

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
    <AlertDialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {componentName != null ? `Remove ${componentName}?` : CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription>{CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={busy}>
            {CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CANCEL}
          </AlertDialogCancel>
          <AlertDialogAction type="button" variant="destructive" disabled={busy} onClick={() => onConfirm()}>
            {CMS_SLOTS_COMPOSER_REMOVE_COMPONENT_DIALOG_CONFIRM}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
