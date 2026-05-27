import {
  CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_CONTINUE,
  CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DESCRIPTION,
  CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DISCARD,
  CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_SAVE,
  CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_TITLE,
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

export type ComposerUnsavedChangesDialogProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSave: () => void | Promise<void>;
};

export function ComposerUnsavedChangesDialog(props: ComposerUnsavedChangesDialogProps) {
  const { open, busy, onOpenChange, onDiscard, onSave } = props;

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel type="button" disabled={busy}>
            {CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_CONTINUE}
          </AlertDialogCancel>
          <AlertDialogCancel type="button" variant="destructive" disabled={busy} onClick={() => onDiscard()}>
            {CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_DISCARD}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void onSave();
            }}
          >
            {CMS_SLOTS_COMPOSER_LEAVE_UNSAVED_DIALOG_SAVE}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
