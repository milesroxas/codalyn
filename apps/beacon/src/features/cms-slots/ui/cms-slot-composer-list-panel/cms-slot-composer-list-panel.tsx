import type { ComposerEligibleList } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import { displayLabelForDataList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  shouldShowCmsSlotsEditorNoSlotsEmpty,
  shouldShowCmsSlotsPreInstall,
} from "@/features/cms-slots/model/cms-slots-access";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotListTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import { CmsSlotPreInstallBlock } from "@/features/cms-slots/ui/cms-slot-pre-install-block";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";

type CmsSlotComposerListPanelProps = {
  pageScanLoading: boolean;
  pageRuntimeStatusLoading: boolean;
  routeStateKnown: boolean;
  composerEligibleResolved: boolean;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  onInstallWrapper: () => void;
  loading: boolean;
  runtimeOk: boolean;
  eligible: ComposerEligibleList[];
  openingKey: string | null;
  onOpenList: (b: ComposerEligibleList) => void;
};

export function CmsSlotComposerListPanel(props: CmsSlotComposerListPanelProps) {
  const {
    pageScanLoading,
    pageRuntimeStatusLoading,
    routeStateKnown,
    composerEligibleResolved,
    beaconsWrapperInstalled,
    installPending,
    onInstallWrapper,
    loading,
    runtimeOk,
    eligible,
    openingKey,
    onOpenList,
  } = props;
  const { composerOnly } = useCmsSlotsAccess();
  const composerListSettled =
    routeStateKnown && !pageScanLoading && !pageRuntimeStatusLoading && !loading && composerEligibleResolved;
  const showEditorNoSlotsEmpty = shouldShowCmsSlotsEditorNoSlotsEmpty({
    composerOnly,
    composerListSettled,
    beaconsWrapperInstalled,
    eligibleCount: eligible.length,
  });

  if (!composerListSettled) {
    return null;
  }

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

  if (shouldShowCmsSlotsPreInstall({ routeStateKnown, beaconsWrapperInstalled })) {
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
      {runtimeOk && eligible.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0" aria-label="Lists available in Composer">
          {eligible.map((b) => (
            <CmsSlotListTile
              key={b.key}
              label={displayLabelForDataList(b.dataList)}
              disabled={openingKey !== null}
              busy={openingKey === b.key}
              onOpen={() => void onOpenList(b)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
