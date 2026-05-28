import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { BeaconRouteLoadingShell } from "@/app/ui/beacon-route-loading-shell";
import type { ComposerEligibleList } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  shouldShowCmsSlotsComposerInstallInEngineEmpty,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
} from "@/features/cms-slots/model/cms-slots-access";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotListTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { CmsSlotsComposerInstallInEngineEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-install-in-engine-empty-state";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";
import {
  CMS_SLOTS_COMPOSER_EDITABLE_SECTION_LABEL,
  CMS_SLOTS_ROUTE_TASK_LOADING_COMPOSER_LISTS,
} from "@/shared/lib/cms-slots-feature-copy";
import { SectionLabelDivider } from "@/shared/ui/section-label-divider";

type CmsSlotComposerListPanelProps = {
  composerEditingContext: CmsComposerEditingContextViewModel;
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
    composerEditingContext,
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
  const showListLoading = useDeferredLoadingIndicator(!composerListSettled);

  if (showListLoading) {
    return (
      <BeaconRouteLoadingShell
        ariaLabel={CMS_SLOTS_ROUTE_TASK_LOADING_COMPOSER_LISTS}
        message={CMS_SLOTS_ROUTE_TASK_LOADING_COMPOSER_LISTS}
        dataSlot="cms_slots_composer_list_loading"
      />
    );
  }

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
      <CmsSlotsComposerEditingContextCard context={composerEditingContext} />
      {runtimeOk && eligible.length > 0 ? (
        <div className="space-y-3">
          <SectionLabelDivider label={CMS_SLOTS_COMPOSER_EDITABLE_SECTION_LABEL} />
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
        </div>
      ) : null}
    </div>
  );
}
