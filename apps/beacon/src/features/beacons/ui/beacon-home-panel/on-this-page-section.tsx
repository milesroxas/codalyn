import { Loader2, Plus, Trash2 } from "lucide-react";
import { displayLabelForDataList } from "@/features/beacons/model/beacon-data-list-display";
import { BEACON_SLOT_NAME_MAX } from "@/features/beacons/model/beacon-list-runtime-payload";
import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import {
  CMS_SLOTS_ADD_SLOT_LABEL,
  CMS_SLOTS_PAGE_LIST_ARIA_LABEL,
  CMS_SLOTS_SCAN_ARIA_LABEL,
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

type OnThisPageSectionProps = {
  nameFieldId: string;
  pageBeacons: BeaconOnPage[];
  pageScanLoading: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  onCreate: () => void;
  onOpenBeacon: (b: BeaconOnPage) => void;
  onRequestDelete: (b: BeaconOnPage) => void;
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
  const nameLen = beaconName.length > BEACON_SLOT_NAME_MAX ? BEACON_SLOT_NAME_MAX : beaconName.length;

  return (
    <div className="space-y-3" data-slot="beacon_on_page">
      {pageScanLoading ? (
        <div className="flex justify-center py-1">
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-label={CMS_SLOTS_SCAN_ARIA_LABEL}
          />
        </div>
      ) : null}

      <Drawer open={createFormOpen} onOpenChange={setCreateFormOpen} dismissible>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="cmsSlotsCard"
            size="cmsSlotsCard"
            disabled={pageScanLoading}
            aria-busy={pageScanLoading}
            aria-expanded={createFormOpen}
            aria-haspopup="dialog"
          >
            <span>{CMS_SLOTS_ADD_SLOT_LABEL}</span>
            <Plus aria-hidden strokeWidth={2.25} />
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
                {nameLen}/{BEACON_SLOT_NAME_MAX}
              </span>
            </div>
            <Input
              id={nameFieldId}
              value={beaconName}
              maxLength={BEACON_SLOT_NAME_MAX}
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
        <ul className="divide-y divide-border" aria-label={CMS_SLOTS_PAGE_LIST_ARIA_LABEL}>
          {pageBeacons.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">{displayLabelForDataList(b.dataList)}</p>
                <p className="font-mono text-[0.65rem] text-muted-foreground break-all">{b.dataList}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={openingBeaconKey !== null || deletePendingKey !== null}
                  onClick={() => void onOpenBeacon(b)}
                >
                  {openingBeaconKey === b.key ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Open"}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={openingBeaconKey !== null || deletePendingKey !== null}
                  aria-label={`Delete ${displayLabelForDataList(b.dataList)}`}
                  onClick={() => onRequestDelete(b)}
                >
                  {deletePendingKey === b.key ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
