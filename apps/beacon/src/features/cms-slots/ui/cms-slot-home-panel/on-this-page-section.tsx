import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CmsSlotDisplayNameDialog } from "@/features/cms-slots/ui/cms-slot-display-name-dialog";
import { CmsSlotPublishedSlotTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import {
  CMS_SLOTS_ADD_SLOT_LABEL,
  CMS_SLOTS_PAGE_LIST_ARIA_LABEL,
  CMS_SLOTS_PUBLISHED_SECTION_LABEL,
  CMS_SLOTS_RENAME_SLOT_DIALOG_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { SurfaceSummaryCardPanelSectionLabel } from "@/shared/ui/surface-summary-card";

type OnThisPageSectionProps = {
  nameFieldId: string;
  pageBeacons: CmsSlotListOnPage[];
  pageScanLoading: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  onCreate: () => void;
  onOpenBeacon: (b: CmsSlotListOnPage) => void;
  onRequestDelete: (b: CmsSlotListOnPage) => void;
  onRenameBeacon: (b: CmsSlotListOnPage, nextDisplayName: string) => boolean | Promise<boolean>;
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
  renamePendingKey: string | null;
};

export function OnThisPageSection(props: OnThisPageSectionProps) {
  const {
    nameFieldId,
    pageBeacons,
    pageScanLoading,
    createFormOpen,
    setCreateFormOpen,
    beaconName,
    setBeaconName,
    createPending,
    onCreate,
    onOpenBeacon,
    onRequestDelete,
    onRenameBeacon,
    openingBeaconKey,
    deletePendingKey,
    renamePendingKey,
  } = props;
  const showPageScanLoading = useDeferredLoadingIndicator(pageScanLoading);
  const renameFieldId = useId();
  const [renameTarget, setRenameTarget] = useState<CmsSlotListOnPage | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const hasBeacons = pageBeacons.length > 0;
  // Dense lists (3+ published slots) switch to the slim row tile; one or two keep the full upload-card look.
  const compactTiles = pageBeacons.length >= 3;
  const renameBaseline = renameTarget != null ? displayLabelForCmsSlotList(renameTarget).trim() : "";
  const renameDraftTrimmed = renameDraft.trim();
  const renameSaveDisabled =
    renameDraftTrimmed === "" ||
    (renameBaseline !== "" && renameDraftTrimmed.toLowerCase() === renameBaseline.toLowerCase());

  const openRenameDialog = (beacon: CmsSlotListOnPage) => {
    setRenameTarget(beacon);
    setRenameDraft(displayLabelForCmsSlotList(beacon));
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setRenameDraft("");
  };

  return (
    <div className="space-y-3" data-slot="cms_slots_on_page">
      <CmsSlotDisplayNameDialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            closeRenameDialog();
          }
        }}
        title={CMS_SLOTS_RENAME_SLOT_DIALOG_TITLE}
        fieldId={renameFieldId}
        value={renameDraft}
        onValueChange={setRenameDraft}
        primaryLabel="Save"
        primaryPending={renamePendingKey != null}
        primaryDisabled={renameSaveDisabled}
        onPrimary={() => {
          if (renameTarget == null) {
            return;
          }
          void (async () => {
            const ok = await onRenameBeacon(renameTarget, renameDraft);
            if (ok) {
              closeRenameDialog();
            }
          })();
        }}
        secondaryLabel="Cancel"
        secondaryDisabled={renamePendingKey != null}
        onSecondary={closeRenameDialog}
      />

      {hasBeacons ? (
        <div className="space-y-3">
          <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_PUBLISHED_SECTION_LABEL}</SurfaceSummaryCardPanelSectionLabel>
          <ul
            className={cn("m-0 grid list-none grid-cols-1 p-0", compactTiles ? "gap-2" : "gap-3")}
            aria-label={CMS_SLOTS_PAGE_LIST_ARIA_LABEL}
          >
            {pageBeacons.map((b) => (
              <CmsSlotPublishedSlotTile
                key={b.key}
                dataList={b.dataList}
                displayName={b.displayName}
                disabled={openingBeaconKey !== null || deletePendingKey !== null || renamePendingKey !== null}
                opening={openingBeaconKey === b.key}
                deleting={deletePendingKey === b.key}
                renaming={renamePendingKey === b.key}
                compact={compactTiles}
                onOpen={() => void onOpenBeacon(b)}
                onRequestDelete={() => onRequestDelete(b)}
                onRequestRename={() => openRenameDialog(b)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <CmsSlotDisplayNameDialog
        open={createFormOpen}
        onOpenChange={setCreateFormOpen}
        title={CMS_SLOTS_ADD_SLOT_LABEL}
        fieldId={nameFieldId}
        value={beaconName}
        onValueChange={setBeaconName}
        primaryLabel="Create"
        primaryPending={createPending}
        primaryDisabled={!beaconName.trim()}
        onPrimary={() => void onCreate()}
        secondaryLabel="Cancel"
        secondaryDisabled={createPending}
        onSecondary={() => setCreateFormOpen(false)}
        trigger={
          <Button
            type="button"
            variant="default"
            size="actionCard"
            disabled={pageScanLoading}
            aria-busy={showPageScanLoading}
            aria-expanded={createFormOpen}
            aria-haspopup="dialog"
          >
            <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
            <span>{CMS_SLOTS_ADD_SLOT_LABEL}</span>
          </Button>
        }
      />
    </div>
  );
}
