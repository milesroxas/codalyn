import {
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_DESCRIPTION,
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY,
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE,
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_WAITING,
  CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export type CmsSlotsCmsFieldLinkDialogProps = {
  open: boolean;
  navReady: boolean;
  retryPending: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryLink: () => void | Promise<void>;
};

export function CmsSlotsCmsFieldLinkDialog(p: CmsSlotsCmsFieldLinkDialogProps) {
  return (
    <AlertDialog open={p.open} onOpenChange={(o) => !p.retryPending && p.onOpenChange(o)}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{CMS_SLOTS_CMS_FIELD_LINK_DIALOG_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm text-muted-foreground">
          {p.navReady ? CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY : CMS_SLOTS_CMS_FIELD_LINK_DIALOG_WAITING}
        </p>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel type="button" disabled={p.retryPending}>
            Dismiss
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={!p.navReady || p.retryPending}
            aria-busy={p.retryPending}
            onClick={() => void p.onRetryLink()}
          >
            {p.retryPending ? "Linking…" : CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
