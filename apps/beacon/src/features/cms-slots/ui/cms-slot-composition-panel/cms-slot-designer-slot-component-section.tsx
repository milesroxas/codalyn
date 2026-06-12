import { Loader2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { cmsSlotListTargetPhaseUnsettled } from "@/features/cms-slots/model/cms-slot-list-target-settled";
import {
  CMS_SLOTS_DESIGNER_CREATE_TARGET_LABEL,
  CMS_SLOTS_DESIGNER_CREATE_TARGET_PENDING_LABEL,
  CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_DESCRIPTION,
  CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_TITLE,
  CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_DESCRIPTION,
  CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_LABEL,
  CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_TITLE,
  CMS_SLOTS_DESIGNER_LIST_TARGET_ON_CANVAS_TITLE,
  CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_DESCRIPTION,
  CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_LABEL,
  CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_TITLE,
  CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_LABEL,
  CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_PENDING_LABEL,
  CMS_SLOTS_DESIGNER_REMOVE_TARGET_LABEL,
  CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_LABEL,
  CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_PENDING_LABEL,
  CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_SELECTED_LABEL,
  CMS_SLOTS_DESIGNER_SLOT_COMPONENT_LABEL,
  CMS_SLOTS_DESIGNER_SLOT_COMPONENT_ON_CANVAS_GUIDE,
  CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_GUIDE,
  CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import {
  SurfaceSummaryCardIconActionGroup,
  SurfaceSummaryCardIconRow,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardIntro,
  SurfaceSummaryCardPanel,
  SurfaceSummaryCardPanelSection,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type CmsSlotDesignerSlotComponentSectionProps = {
  listTargetPhase: CmsSlotListTargetPhase;
  listTargetOnCanvasCount: number;
  listTargetOnCanvasCountResolved: boolean;
  ctaDisabled: boolean;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetSelectedOnCanvas: boolean;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onFocusListTargetOnCanvas: () => void;
  onPlaceListTargetOnCanvas: () => void;
};

function CmsSlotDesignerSlotComponentCard(props: { children: ReactNode }) {
  const { children } = props;

  return (
    <SurfaceSummaryCardPanel tone="default" data-slot="cms_slots_designer_slot_component_card">
      <SurfaceSummaryCardPanelSection showDivider={false} density="compact">
        {children}
      </SurfaceSummaryCardPanelSection>
    </SurfaceSummaryCardPanel>
  );
}

function CmsSlotDesignerSlotComponentAbsentContent(props: {
  ctaDisabled: boolean;
  listTargetCreatePending: boolean;
  onCreateListTarget: () => void;
}) {
  const { ctaDisabled, listTargetCreatePending, onCreateListTarget } = props;

  return (
    <SurfaceSummaryCardIconRow data-slot="cms_slots_designer_list_target_absent">
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_TITLE}</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardIntro>{CMS_SLOTS_DESIGNER_LIST_TARGET_ABSENT_DESCRIPTION}</SurfaceSummaryCardIntro>
      </SurfaceSummaryCardIconRowCopy>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={ctaDisabled}
        aria-busy={listTargetCreatePending}
        onClick={() => void onCreateListTarget()}
      >
        {listTargetCreatePending
          ? CMS_SLOTS_DESIGNER_CREATE_TARGET_PENDING_LABEL
          : CMS_SLOTS_DESIGNER_CREATE_TARGET_LABEL}
      </Button>
    </SurfaceSummaryCardIconRow>
  );
}

function CmsSlotDesignerListTargetPendingActions(props: { listTargetPhase: "loading" | "updating" }) {
  const { listTargetPhase } = props;
  const isUpdating = listTargetPhase === "updating";
  const title = isUpdating
    ? CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_TITLE
    : CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_TITLE;
  const description = isUpdating
    ? CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_DESCRIPTION
    : CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_DESCRIPTION;
  const pendingLabel = isUpdating
    ? CMS_SLOTS_DESIGNER_LIST_TARGET_UPDATING_LABEL
    : CMS_SLOTS_DESIGNER_LIST_TARGET_CHECKING_LABEL;

  return (
    <SurfaceSummaryCardIconRow data-slot="cms_slots_designer_list_target_pending">
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{title}</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardIntro>{description}</SurfaceSummaryCardIntro>
      </SurfaceSummaryCardIconRowCopy>
      <Button type="button" variant="secondary" size="sm" disabled aria-busy="true">
        <Loader2 aria-hidden className="animate-spin" data-icon="inline-start" />
        {pendingLabel}
      </Button>
    </SurfaceSummaryCardIconRow>
  );
}

function CmsSlotDesignerListTargetPlaceActions(props: {
  ctaDisabled: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  onPlaceListTargetOnCanvas: () => void;
}) {
  const { ctaDisabled, listTargetPlaceOnCanvasPending, onPlaceListTargetOnCanvas } = props;

  return (
    <SurfaceSummaryCardIconRow data-slot="cms_slots_designer_list_target_place">
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_TITLE}</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardIntro>{CMS_SLOTS_DESIGNER_SLOT_COMPONENT_PLACE_GUIDE}</SurfaceSummaryCardIntro>
      </SurfaceSummaryCardIconRowCopy>
      <Button
        type="button"
        variant="default"
        size="sm"
        disabled={ctaDisabled}
        aria-busy={listTargetPlaceOnCanvasPending}
        data-slot="cms_slots_designer_list_target_place_action"
        onClick={() => void onPlaceListTargetOnCanvas()}
      >
        {listTargetPlaceOnCanvasPending ? (
          <Loader2 aria-hidden className="animate-spin" data-icon="inline-start" />
        ) : null}
        {listTargetPlaceOnCanvasPending
          ? CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_PENDING_LABEL
          : CMS_SLOTS_DESIGNER_PLACE_ON_CANVAS_LABEL}
      </Button>
    </SurfaceSummaryCardIconRow>
  );
}

function CmsSlotDesignerListTargetOnCanvasActions(props: {
  ctaDisabled: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetRemovePending: boolean;
  listTargetSelectedOnCanvas: boolean;
  onFocusListTargetOnCanvas: () => void;
  onRequestRemoveListTarget: () => void;
}) {
  const {
    ctaDisabled,
    listTargetFocusOnCanvasPending,
    listTargetRemovePending,
    listTargetSelectedOnCanvas,
    onFocusListTargetOnCanvas,
    onRequestRemoveListTarget,
  } = props;

  const selectLabel = listTargetFocusOnCanvasPending
    ? CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_PENDING_LABEL
    : listTargetSelectedOnCanvas
      ? CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_SELECTED_LABEL
      : CMS_SLOTS_DESIGNER_SELECT_ON_CANVAS_LABEL;

  return (
    <SurfaceSummaryCardIconRow data-slot="cms_slots_designer_list_target_on_canvas">
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{CMS_SLOTS_DESIGNER_LIST_TARGET_ON_CANVAS_TITLE}</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardIntro>{CMS_SLOTS_DESIGNER_SLOT_COMPONENT_ON_CANVAS_GUIDE}</SurfaceSummaryCardIntro>
      </SurfaceSummaryCardIconRowCopy>
      <SurfaceSummaryCardIconActionGroup>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={ctaDisabled || listTargetSelectedOnCanvas}
          aria-busy={listTargetFocusOnCanvasPending}
          data-slot="cms_slots_designer_list_target_focus"
          onClick={() => void onFocusListTargetOnCanvas()}
        >
          {listTargetFocusOnCanvasPending ? (
            <Loader2 aria-hidden className="animate-spin" data-icon="inline-start" />
          ) : null}
          {selectLabel}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          disabled={ctaDisabled || listTargetRemovePending}
          aria-busy={listTargetRemovePending}
          aria-label={CMS_SLOTS_DESIGNER_REMOVE_TARGET_LABEL}
          data-slot="cms_slots_designer_list_target_remove"
          onClick={() => void onRequestRemoveListTarget()}
        >
          {listTargetRemovePending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Trash2 aria-hidden strokeWidth={1.75} />
          )}
        </Button>
      </SurfaceSummaryCardIconActionGroup>
    </SurfaceSummaryCardIconRow>
  );
}

function CmsSlotDesignerListTargetSyncedActions(props: {
  ctaDisabled: boolean;
  showPlaceStep: boolean;
  showOnCanvasStep: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetRemovePending: boolean;
  listTargetSelectedOnCanvas: boolean;
  onPlaceListTargetOnCanvas: () => void;
  onFocusListTargetOnCanvas: () => void;
  onRequestRemoveListTarget: () => void;
}) {
  const {
    ctaDisabled,
    showPlaceStep,
    showOnCanvasStep,
    listTargetPlaceOnCanvasPending,
    listTargetFocusOnCanvasPending,
    listTargetRemovePending,
    listTargetSelectedOnCanvas,
    onPlaceListTargetOnCanvas,
    onFocusListTargetOnCanvas,
    onRequestRemoveListTarget,
  } = props;

  if (showOnCanvasStep) {
    return (
      <CmsSlotDesignerListTargetOnCanvasActions
        ctaDisabled={ctaDisabled}
        listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
        listTargetRemovePending={listTargetRemovePending}
        listTargetSelectedOnCanvas={listTargetSelectedOnCanvas}
        onFocusListTargetOnCanvas={onFocusListTargetOnCanvas}
        onRequestRemoveListTarget={onRequestRemoveListTarget}
      />
    );
  }

  if (showPlaceStep) {
    return (
      <CmsSlotDesignerListTargetPlaceActions
        ctaDisabled={ctaDisabled}
        listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
        onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
      />
    );
  }

  return null;
}

export function CmsSlotDesignerSlotComponentSection(props: CmsSlotDesignerSlotComponentSectionProps) {
  const {
    listTargetPhase,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
    ctaDisabled,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending,
    listTargetSelectedOnCanvas,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onFocusListTargetOnCanvas,
    onPlaceListTargetOnCanvas,
  } = props;

  const listTargetCanvasStatusPending = cmsSlotListTargetPhaseUnsettled(
    listTargetPhase,
    listTargetOnCanvasCountResolved
  );
  const showSyncedActions = listTargetPhase === "synced" && listTargetOnCanvasCountResolved;
  const showPlaceStep = showSyncedActions && listTargetOnCanvasCount === 0;
  const showOnCanvasStep = showSyncedActions && listTargetOnCanvasCount > 0;

  return (
    <SurfaceSummaryCardSurfaceSummary data-slot="cms_slots_designer_slot_component">
      <SurfaceSummaryCardPanelSectionLabel>
        {CMS_SLOTS_DESIGNER_SLOT_COMPONENT_LABEL}
      </SurfaceSummaryCardPanelSectionLabel>

      <CmsSlotDesignerSlotComponentCard>
        {listTargetPhase === "absent" ? (
          <CmsSlotDesignerSlotComponentAbsentContent
            ctaDisabled={ctaDisabled}
            listTargetCreatePending={listTargetCreatePending}
            onCreateListTarget={onCreateListTarget}
          />
        ) : null}

        {listTargetCanvasStatusPending ? (
          <CmsSlotDesignerListTargetPendingActions
            listTargetPhase={listTargetPhase === "updating" ? "updating" : "loading"}
          />
        ) : null}

        {showSyncedActions ? (
          <CmsSlotDesignerListTargetSyncedActions
            ctaDisabled={ctaDisabled}
            showPlaceStep={showPlaceStep}
            showOnCanvasStep={showOnCanvasStep}
            listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
            listTargetFocusOnCanvasPending={listTargetFocusOnCanvasPending}
            listTargetRemovePending={listTargetRemovePending}
            listTargetSelectedOnCanvas={listTargetSelectedOnCanvas}
            onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
            onFocusListTargetOnCanvas={onFocusListTargetOnCanvas}
            onRequestRemoveListTarget={onRequestRemoveListTarget}
          />
        ) : null}
      </CmsSlotDesignerSlotComponentCard>
    </SurfaceSummaryCardSurfaceSummary>
  );
}
