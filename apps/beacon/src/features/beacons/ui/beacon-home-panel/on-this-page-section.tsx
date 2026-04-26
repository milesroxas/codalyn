import { Loader2, Trash2 } from "lucide-react";
import { displayLabelForDataList } from "@/features/beacons/model/beacon-data-list-display";
import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import { Button } from "@/shared/ui/button";
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
  const showEmpty = !pageScanLoading && !hasBeacons && !createFormOpen;

  return (
    <div className="space-y-3" data-slot="beacon_on_page">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pageScanLoading ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Scanning page for beacons"
            />
          ) : null}
          <h3 className="text-sm font-medium">On this page</h3>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pageScanLoading || createFormOpen}
          onClick={() => setCreateFormOpen(true)}
        >
          Add
        </Button>
      </div>

      {createFormOpen ? (
        <div className="space-y-2 rounded-md border border-border/80 bg-muted/20 px-3 py-3" data-slot="beacon_add_form">
          <div className="space-y-2">
            <Label htmlFor={nameFieldId}>Name</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                id={nameFieldId}
                value={beaconName}
                onChange={(e) => setBeaconName(e.target.value)}
                placeholder="e.g. Home hero"
                autoComplete="off"
                className="min-w-0 sm:flex-1"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  className="flex-1 sm:flex-initial"
                  disabled={createPending || !beaconName.trim()}
                  onClick={() => void onCreate()}
                >
                  {createPending ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreateFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <p className="text-sm text-muted-foreground">
          Click <span className="font-medium text-foreground">Add</span> for a hidden beacon, then open it to add
          components.
        </p>
      ) : null}

      {hasBeacons ? (
        <ul className="divide-y divide-border" aria-label="Beacons on this page">
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
