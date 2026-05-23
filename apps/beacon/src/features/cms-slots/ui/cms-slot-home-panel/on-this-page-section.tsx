import { Plus } from "lucide-react";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CmsSlotPublishedSlotTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import {
  CMS_SLOTS_ADD_SLOT_LABEL,
  CMS_SLOTS_PAGE_LIST_ARIA_LABEL,
  CMS_SLOTS_PUBLISHED_SECTION_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
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
import { SectionLabelDivider } from "@/shared/ui/section-label-divider";

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
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
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
    openingBeaconKey,
    deletePendingKey,
  } = props;

  const hasBeacons = pageBeacons.length > 0;
  const nameLen = beaconName.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : beaconName.length;

  return (
    <div className="space-y-3" data-slot="cms_slots_on_page">
      <Drawer open={createFormOpen} onOpenChange={setCreateFormOpen} dismissible>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="actionCard"
            size="actionCard"
            disabled={pageScanLoading}
            aria-busy={pageScanLoading}
            aria-expanded={createFormOpen}
            aria-haspopup="dialog"
          >
            <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
            <span>{CMS_SLOTS_ADD_SLOT_LABEL}</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{CMS_SLOTS_ADD_SLOT_LABEL}</DrawerTitle>
            <DrawerDescription className="sr-only">Choose a display name for the new CMS slot.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 pb-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={nameFieldId} className="text-xs text-muted-foreground">
                Slot name
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {nameLen}/{CMS_SLOT_ROW_NAME_MAX}
              </span>
            </div>
            <Input
              id={nameFieldId}
              value={beaconName}
              maxLength={CMS_SLOT_ROW_NAME_MAX}
              onChange={(e) => setBeaconName(e.target.value)}
              autoComplete="off"
              name="beacon-slot-name"
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
          <DrawerFooter className="gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={createPending || !beaconName.trim()}
              onClick={() => void onCreate()}
            >
              {createPending ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={createPending}
              onClick={() => setCreateFormOpen(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {hasBeacons ? (
        <div className="space-y-3">
          <SectionLabelDivider label={CMS_SLOTS_PUBLISHED_SECTION_LABEL} />
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0" aria-label={CMS_SLOTS_PAGE_LIST_ARIA_LABEL}>
            {pageBeacons.map((b) => (
              <CmsSlotPublishedSlotTile
                key={b.key}
                dataList={b.dataList}
                disabled={openingBeaconKey !== null || deletePendingKey !== null}
                opening={openingBeaconKey === b.key}
                deleting={deletePendingKey === b.key}
                onOpen={() => void onOpenBeacon(b)}
                onRequestDelete={() => onRequestDelete(b)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
