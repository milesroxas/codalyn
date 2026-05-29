import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CmsSlotDisplayNameDrawer } from "@/features/cms-slots/ui/cms-slot-display-name-drawer";
import { CmsSlotPublishedSlotTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import {
  CMS_SLOTS_ADD_SLOT_LABEL,
  CMS_SLOTS_PAGE_LIST_ARIA_LABEL,
  CMS_SLOTS_PUBLISHED_SECTION_LABEL,
  CMS_SLOTS_RENAME_SLOT_DRAWER_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
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
  const renameBaseline = renameTarget != null ? displayLabelForCmsSlotList(renameTarget).trim() : "";
  const renameDraftTrimmed = renameDraft.trim();
  const renameSaveDisabled =
    renameDraftTrimmed === "" ||
    (renameBaseline !== "" && renameDraftTrimmed.toLowerCase() === renameBaseline.toLowerCase());

  const openRenameDrawer = (beacon: CmsSlotListOnPage) => {
    setRenameTarget(beacon);
    setRenameDraft(displayLabelForCmsSlotList(beacon));
  };

  const closeRenameDrawer = () => {
    setRenameTarget(null);
    setRenameDraft("");
  };

  return (
    <div className="space-y-3" data-slot="cms_slots_on_page">
      <CmsSlotDisplayNameDrawer
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            closeRenameDrawer();
          }
        }}
        title={CMS_SLOTS_RENAME_SLOT_DRAWER_TITLE}
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
              closeRenameDrawer();
            }
          })();
        }}
        secondaryLabel="Cancel"
        secondaryDisabled={renamePendingKey != null}
        onSecondary={closeRenameDrawer}
      />

      {hasBeacons ? (
        <div className="space-y-3">
          <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_PUBLISHED_SECTION_LABEL}</SurfaceSummaryCardPanelSectionLabel>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0" aria-label={CMS_SLOTS_PAGE_LIST_ARIA_LABEL}>
            {pageBeacons.map((b) => (
              <CmsSlotPublishedSlotTile
                key={b.key}
                dataList={b.dataList}
                displayName={b.displayName}
                disabled={openingBeaconKey !== null || deletePendingKey !== null || renamePendingKey !== null}
                opening={openingBeaconKey === b.key}
                deleting={deletePendingKey === b.key}
                renaming={renamePendingKey === b.key}
                onOpen={() => void onOpenBeacon(b)}
                onRequestDelete={() => onRequestDelete(b)}
                onRequestRename={() => openRenameDrawer(b)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <CmsSlotDisplayNameDrawer
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
