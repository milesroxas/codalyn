import type { ComposerEligibleList } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  shouldShowCmsSlotsComposerInstallInEngineEmpty,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
} from "@/features/cms-slots/model/cms-slots-access";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotListTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import { CmsSlotsComposerInstallInEngineEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-install-in-engine-empty-state";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";

type CmsSlotComposerListPanelProps = {
  pageScanLoading: boolean;
  pageRuntimeStatusLoading: boolean;
  routeStateKnown: boolean;
  composerEligibleResolved: boolean;
  beaconsWrapperInstalled: boolean;
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
    loading,
    runtimeOk,
    eligible,
    openingKey,
    onOpenList,
  } = props;
  const { composerOnly, canAccessEngine } = useCmsSlotsAccess();
  const composerListSettled =
    routeStateKnown && !pageScanLoading && !pageRuntimeStatusLoading && !loading && composerEligibleResolved;
  const showEditorNoSlotsEmpty = shouldShowCmsSlotsEditorNoSlotsEmpty({
    composerOnly,
    composerListSettled,
    beaconsWrapperInstalled,
    eligibleCount: eligible.length,
  });
  const showInstallInEngineEmpty = shouldShowCmsSlotsComposerInstallInEngineEmpty({
    canAccessEngine,
    routeStateKnown,
    beaconsWrapperInstalled,
  });

  if (!composerListSettled) {
    return null;
  }

  if (showEditorNoSlotsEmpty) {
    return <CmsSlotsEditorNoSlotsEmptyState data-slot="beacon_composer_editor_no_slots" />;
  }

  if (showInstallInEngineEmpty) {
    return <CmsSlotsComposerInstallInEngineEmptyState data-slot="beacon_composer_install_in_engine" />;
  }

  return (
    <div className="space-y-4" data-slot="beacon_composer_list">
      <CmsSlotsRouteMainIntro segment="composer" />
      {runtimeOk && eligible.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0" aria-label="Lists available in Composer">
          {eligible.map((b) => (
            <CmsSlotListTile
              key={b.key}
              label={displayLabelForCmsSlotList(b)}
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
