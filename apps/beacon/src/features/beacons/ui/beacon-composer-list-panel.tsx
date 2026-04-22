import { Loader2 } from "lucide-react";
import type { ComposerEligibleList } from "@/features/beacons/model/beacon-composer-eligible";
import { Button } from "@/shared/ui/button";

function displayLabelForDataList(dataList: string): string {
  if (dataList.startsWith("beacon-")) {
    return dataList.slice("beacon-".length);
  }
  return dataList;
}

type BeaconComposerListPanelProps = {
  pageScanLoading: boolean;
  beaconsWrapperInstalled: boolean;
  loading: boolean;
  runtimeOk: boolean;
  /** Footer hash OK but Engine changed beacon contents since last Sync. */
  engineCompositionStale: boolean;
  eligible: ComposerEligibleList[];
  openingKey: string | null;
  onOpenList: (b: ComposerEligibleList) => void;
  onRefresh: () => void;
};

export function BeaconComposerListPanel(props: BeaconComposerListPanelProps) {
  const {
    pageScanLoading,
    beaconsWrapperInstalled,
    loading,
    runtimeOk,
    engineCompositionStale,
    eligible,
    openingKey,
    onOpenList,
    onRefresh,
  } = props;

  if (!beaconsWrapperInstalled) {
    return (
      <p className="text-sm text-muted-foreground" data-slot="beacon_composer_install_first">
        Install beacons on this page in <span className="font-medium text-foreground">Engine</span> first.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_composer_list">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {loading || pageScanLoading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Loading lists" />
          ) : null}
          <p className="text-sm font-medium">Compose a list</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={loading || pageScanLoading}
          onClick={() => void onRefresh()}
        >
          Refresh
        </Button>
      </div>

      {engineCompositionStale && !loading && !pageScanLoading ? (
        <p className="text-sm text-amber-800 dark:text-amber-200" data-slot="beacon_composer_engine_stale">
          Beacon list changed in Engine — sync page script there first.
        </p>
      ) : null}

      {runtimeOk && eligible.length === 0 && !loading && !pageScanLoading ? (
        <p className="text-sm text-muted-foreground">
          No lists yet — in <span className="font-medium text-foreground">Engine</span>, sync page script, add
          components to a beacon, place the list target.
        </p>
      ) : null}

      {runtimeOk && eligible.length > 0 ? (
        <ul className="divide-y divide-border" aria-label="Lists available in Composer">
          {eligible.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">{displayLabelForDataList(b.dataList)}</p>
                <p className="font-mono text-[0.65rem] text-muted-foreground break-all">{b.dataList}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0"
                disabled={openingKey !== null}
                onClick={() => void onOpenList(b)}
              >
                {openingKey === b.key ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Open studio"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
