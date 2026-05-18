import { Loader2, RefreshCw } from "lucide-react";
import type { ComposerEligibleList } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import { displayLabelForDataList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import { shouldShowCmsSlotsEditorNoSlotsEmpty } from "@/features/cms-slots/model/cms-slots-access";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotPreInstallBlock } from "@/features/cms-slots/ui/cms-slot-pre-install-block";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";
import { Button } from "@/shared/ui/button";

type CmsSlotComposerListPanelProps = {
  pageScanLoading: boolean;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  onInstallWrapper: () => void;
  loading: boolean;
  runtimeOk: boolean;
  eligible: ComposerEligibleList[];
  openingKey: string | null;
  onOpenList: (b: ComposerEligibleList) => void;
  onRefresh: () => void;
};

export function CmsSlotComposerListPanel(props: CmsSlotComposerListPanelProps) {
  const {
    pageScanLoading,
    beaconsWrapperInstalled,
    installPending,
    onInstallWrapper,
    loading,
    runtimeOk,
    eligible,
    openingKey,
    onOpenList,
    onRefresh,
  } = props;
  const { composerOnly } = useCmsSlotsAccess();
  const scanSettled = !loading && !pageScanLoading;
  const showEditorNoSlotsEmpty = shouldShowCmsSlotsEditorNoSlotsEmpty({
    composerOnly,
    scanSettled,
    beaconsWrapperInstalled,
    eligibleCount: eligible.length,
  });

  if (showEditorNoSlotsEmpty) {
    return (
      <div
        className="flex min-h-[min(40vh,16rem)] flex-col items-center justify-center py-4"
        data-slot="beacon_composer_editor_no_slots"
      >
        <CmsSlotsEditorNoSlotsEmptyState className="w-full max-w-md" />
      </div>
    );
  }

  if (!beaconsWrapperInstalled) {
    return (
      <div
        className="flex min-h-[min(40vh,16rem)] flex-col items-center justify-center py-4"
        data-slot="beacon_composer_install_first"
      >
        <CmsSlotPreInstallBlock
          installPending={installPending}
          pageScanLoading={pageScanLoading}
          onInstallWrapper={onInstallWrapper}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_composer_list">
      <div className="flex items-center justify-end gap-2">
        {loading || pageScanLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Loading lists" />
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={loading || pageScanLoading}
          aria-label="Refresh lists"
          onClick={() => void onRefresh()}
        >
          <RefreshCw aria-hidden className="size-4" />
        </Button>
      </div>

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
