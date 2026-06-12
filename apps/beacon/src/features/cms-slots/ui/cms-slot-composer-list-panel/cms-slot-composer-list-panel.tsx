import type { ComposerEligibleList } from "@/features/cms-slots/model/cms-slot-composer-eligible";
import { displayLabelForCmsSlotList } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  shouldShowCmsSlotsComposerDesignerNotReadyEmpty,
  shouldShowCmsSlotsEditorNoSlotsEmpty,
} from "@/features/cms-slots/model/cms-slots-access";
import {
  cmsSlotsComposerListDataReady,
  cmsSlotsComposerListPanelContentKey,
} from "@/features/cms-slots/model/cms-slots-panel-content-key";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotListTile } from "@/features/cms-slots/ui/cms-slot-list-tile";
import { CmsSlotsComposerDesignerNotReadyEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-designer-not-ready-empty-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { CmsSlotsComposerInstallInDesignerEmptyState } from "@/features/cms-slots/ui/cms-slots-composer-install-in-designer-empty-state";
import { CmsSlotsEditorNoSlotsEmptyState } from "@/features/cms-slots/ui/cms-slots-editor-no-slots-empty-state";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";
import { CMS_SLOTS_COMPOSER_EDITABLE_SECTION_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { SurfaceSummaryCardPanelSectionLabel } from "@/shared/ui/surface-summary-card";

type CmsSlotComposerListPanelProps = {
  composerEditingContext: CmsComposerEditingContextViewModel;
  pageBootBlocking: boolean;
  pageRuntimeStatusLoading: boolean;
  routeStateKnown: boolean;
  composerEligibleResolved: boolean;
  beaconsWrapperInstalled: boolean;
  loading: boolean;
  runtimeOk: boolean;
  eligible: ComposerEligibleList[];
  openingKey: string | null;
  onOpenList: (b: ComposerEligibleList) => void;
  onEditorNoSlotsBack: () => void;
};

export function CmsSlotComposerListPanel(props: CmsSlotComposerListPanelProps) {
  const {
    composerEditingContext,
    pageBootBlocking,
    pageRuntimeStatusLoading,
    routeStateKnown,
    composerEligibleResolved,
    beaconsWrapperInstalled,
    loading,
    runtimeOk,
    eligible,
    openingKey,
    onOpenList,
    onEditorNoSlotsBack,
  } = props;
  const { composerOnly, canAccessDesigner } = useCmsSlotsAccess();
  const listDataReady = cmsSlotsComposerListDataReady({
    routeStateKnown,
    pageBootBlocking,
    pageRuntimeStatusLoading,
    composerEligibleLoading: loading,
    composerEligibleResolved,
  });
  const showEditorNoSlotsEmpty = shouldShowCmsSlotsEditorNoSlotsEmpty({
    composerOnly,
    composerListSettled: listDataReady,
    beaconsWrapperInstalled,
    eligibleCount: eligible.length,
  });
  const showDesignerNotReadyEmpty = shouldShowCmsSlotsComposerDesignerNotReadyEmpty({
    canAccessDesigner,
    composerListSettled: listDataReady,
    beaconsWrapperInstalled,
    eligibleCount: eligible.length,
  });
  const listContentKey = cmsSlotsComposerListPanelContentKey({
    routeStateKnown,
    beaconsWrapperInstalled,
    showEditorNoSlotsEmpty,
    showDesignerNotReadyEmpty,
    canAccessDesigner,
  });

  if (listContentKey === "editor-empty") {
    return <CmsSlotsEditorNoSlotsEmptyState data-slot="beacon_composer_editor_no_slots" onBack={onEditorNoSlotsBack} />;
  }

  if (listContentKey === "designer-install-prompt") {
    return <CmsSlotsComposerInstallInDesignerEmptyState data-slot="beacon_composer_install_in_designer" />;
  }

  if (listContentKey === "designer-not-ready") {
    return (
      <CmsSlotsComposerDesignerNotReadyEmptyState
        data-slot="beacon_composer_designer_not_ready"
        onBack={onEditorNoSlotsBack}
      />
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_composer_list">
      <CmsSlotsRouteMainIntro segment="composer" />
      <CmsSlotsComposerEditingContextCard context={composerEditingContext} />
      {runtimeOk && eligible.length > 0 ? (
        <div className="space-y-3">
          <SurfaceSummaryCardPanelSectionLabel>
            {CMS_SLOTS_COMPOSER_EDITABLE_SECTION_LABEL}
          </SurfaceSummaryCardPanelSectionLabel>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0" aria-label="Lists available in Composer">
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
