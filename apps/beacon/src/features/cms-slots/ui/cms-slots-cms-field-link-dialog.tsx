import {
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_HINT,
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY,
  CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE,
  CMS_SLOTS_CMS_FIELD_LINK_PENDING_LABEL,
  CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL,
  CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_DESCRIPTION,
  CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_TITLE,
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

export type CmsSlotsCmsFieldLinkDialogVariant = "post-create" | "detected-unlinked";

export type CmsSlotsCmsFieldLinkDialogProps = {
  open: boolean;
  variant: CmsSlotsCmsFieldLinkDialogVariant;
  navReady: boolean;
  retryPending: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryLink: () => void | Promise<void>;
};

function resolveCmsFieldLinkDialogCopy(
  variant: CmsSlotsCmsFieldLinkDialogVariant,
  navReady: boolean
): {
  title: string;
  description: string;
  linkEnabled: boolean;
} {
  if (variant === "detected-unlinked") {
    return {
      title: CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_TITLE,
      description: CMS_SLOTS_LIST_TARGET_CMS_FIELD_LINK_DIALOG_DESCRIPTION,
      linkEnabled: true,
    };
  }
  return {
    title: CMS_SLOTS_CMS_FIELD_LINK_DIALOG_TITLE,
    description: navReady ? CMS_SLOTS_CMS_FIELD_LINK_DIALOG_READY : CMS_SLOTS_CMS_FIELD_LINK_DIALOG_HINT,
    linkEnabled: navReady,
  };
}

export function CmsSlotsCmsFieldLinkDialog(p: CmsSlotsCmsFieldLinkDialogProps) {
  const copy = resolveCmsFieldLinkDialogCopy(p.variant, p.navReady);

  return (
    <AlertDialog open={p.open} onOpenChange={(o) => !p.retryPending && p.onOpenChange(o)}>
      <AlertDialogContent size="default" data-slot="cms_slots_cms_field_link_dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-wrap">
          <AlertDialogCancel type="button" disabled={p.retryPending}>
            Dismiss
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={!copy.linkEnabled || p.retryPending}
            aria-busy={p.retryPending}
            data-slot="cms_slots_cms_field_link_action"
            onClick={() => void p.onRetryLink()}
          >
            {p.retryPending ? CMS_SLOTS_CMS_FIELD_LINK_PENDING_LABEL : CMS_SLOTS_CMS_FIELD_LINK_RETRY_LABEL}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
