import { List } from "lucide-react";

import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import {
  CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL,
  CMS_SLOTS_ENGINE_CREATE_TARGET_HINT,
  CMS_SLOTS_ENGINE_CREATE_TARGET_LABEL,
  CMS_SLOTS_ENGINE_CREATE_TARGET_PENDING_LABEL,
  CMS_SLOTS_ENGINE_CURRENT_LIST_LABEL,
  CMS_SLOTS_ENGINE_EDITING_DESCRIPTION,
  CMS_SLOTS_ENGINE_EDITING_TITLE,
  CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_HINT,
  CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_LABEL,
  CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_PENDING_LABEL,
  CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_LABEL,
  CMS_SLOTS_ENGINE_LIST_TARGET_META,
  CMS_SLOTS_ENGINE_LIST_TARGET_STATUS_HINT,
  CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_LABEL,
  CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_HINT,
  CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_LABEL,
  CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_PENDING_LABEL,
  CMS_SLOTS_ENGINE_REMOVE_TARGET_LABEL,
  cmsSlotsEngineListTargetActionsAriaLabel,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import {
  SurfaceSummaryCardCanvasActionRow,
  SurfaceSummaryCardFormFields,
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardPageIntro,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceActionsMenu,
  type SurfaceSummaryCardSurfaceActionsMenuItem,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type CmsSlotEngineListContextSectionProps = {
  activeDataList: string | null;
  activeListLabel: string | null;
  removingKey: string | null;
  listTargetPhase: CmsSlotListTargetPhase;
  listTargetActionBusy: boolean;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetFocusOnCanvasPending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetOnCanvasCount: number;
  listTargetOnCanvasCountResolved: boolean;
  onBackToList: () => void;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onFocusListTargetOnCanvas: () => void;
  onPlaceListTargetOnCanvas: () => void;
};

function resolveCanvasActionHint(listTargetPhase: CmsSlotListTargetPhase, listTargetOnCanvasCount: number): string {
  if (listTargetPhase === "loading" || listTargetPhase === "updating") {
    return CMS_SLOTS_ENGINE_LIST_TARGET_STATUS_HINT;
  }
  if (listTargetPhase === "absent") {
    return CMS_SLOTS_ENGINE_CREATE_TARGET_HINT;
  }
  if (listTargetOnCanvasCount > 0) {
    return CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_HINT;
  }
  return CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_HINT;
}

function buildSyncedListTargetMenuItems(props: {
  listTargetOnCanvasCount: number;
  listTargetFocusOnCanvasPending: boolean;
  onFocusListTargetOnCanvas: () => void;
  onRequestRemoveListTarget: () => void;
}): SurfaceSummaryCardSurfaceActionsMenuItem[] {
  const {
    listTargetOnCanvasCount,
    listTargetFocusOnCanvasPending,
    onFocusListTargetOnCanvas,
    onRequestRemoveListTarget,
  } = props;
  const items: SurfaceSummaryCardSurfaceActionsMenuItem[] = [];

  if (listTargetOnCanvasCount > 0) {
    items.push({
      id: "focus-on-canvas",
      label: CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_LABEL,
      pendingLabel: CMS_SLOTS_ENGINE_FOCUS_ON_CANVAS_PENDING_LABEL,
      pending: listTargetFocusOnCanvasPending,
      onSelect: () => void onFocusListTargetOnCanvas(),
    });
  }

  items.push({
    id: "remove-target",
    label: CMS_SLOTS_ENGINE_REMOVE_TARGET_LABEL,
    variant: "destructive",
    onSelect: () => void onRequestRemoveListTarget(),
  });

  return items;
}

type CmsSlotEngineCurrentListSummaryProps = {
  activeListLabel: string;
  actionsMenuAriaLabel?: string;
  actionsMenuDisabled?: boolean;
  actionsMenuItems?: SurfaceSummaryCardSurfaceActionsMenuItem[];
};

function CmsSlotEngineCurrentListSummary(props: CmsSlotEngineCurrentListSummaryProps) {
  const { activeListLabel, actionsMenuAriaLabel, actionsMenuDisabled = false, actionsMenuItems = [] } = props;

  return (
    <SurfaceSummaryCardSurfaceSummary>
      <SurfaceSummaryCardPanelSectionLabel>{CMS_SLOTS_ENGINE_CURRENT_LIST_LABEL}</SurfaceSummaryCardPanelSectionLabel>
      <SurfaceSummaryCardSurfaceDisplay contained>
        <SurfaceSummaryCardIconBox>
          <List aria-hidden strokeWidth={1.5} />
        </SurfaceSummaryCardIconBox>
        <SurfaceSummaryCardIconRowCopy>
          <SurfaceSummaryCardTitle>{activeListLabel}</SurfaceSummaryCardTitle>
          <SurfaceSummaryCardMeta>{CMS_SLOTS_ENGINE_LIST_TARGET_META}</SurfaceSummaryCardMeta>
        </SurfaceSummaryCardIconRowCopy>
        {actionsMenuAriaLabel != null ? (
          <SurfaceSummaryCardSurfaceActionsMenu
            ariaLabel={actionsMenuAriaLabel}
            disabled={actionsMenuDisabled}
            items={actionsMenuItems}
          />
        ) : null}
      </SurfaceSummaryCardSurfaceDisplay>
    </SurfaceSummaryCardSurfaceSummary>
  );
}

function CmsSlotEnginePlaceOnCanvasAction(props: {
  canvasActionHint: string;
  ctaDisabled: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  onPlaceListTargetOnCanvas: () => void;
}) {
  const { canvasActionHint, ctaDisabled, listTargetPlaceOnCanvasPending, onPlaceListTargetOnCanvas } = props;

  return (
    <SurfaceSummaryCardCanvasActionRow
      actionLabel={CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_LABEL}
      actionPendingLabel={CMS_SLOTS_ENGINE_PLACE_ON_CANVAS_PENDING_LABEL}
      actionVariant="default"
      disabled={ctaDisabled}
      label={canvasActionHint}
      labelEmphasis="hint"
      onAction={() => void onPlaceListTargetOnCanvas()}
      pending={listTargetPlaceOnCanvasPending}
    />
  );
}

function CmsSlotEngineAbsentActions(props: {
  canvasActionHint: string;
  ctaDisabled: boolean;
  listTargetCreatePending: boolean;
  onBackToList: () => void;
  onCreateListTarget: () => void;
}) {
  const { canvasActionHint, ctaDisabled, listTargetCreatePending, onBackToList, onCreateListTarget } = props;

  return (
    <>
      <SurfaceSummaryCardCanvasActionRow
        actionLabel={CMS_SLOTS_ENGINE_CREATE_TARGET_LABEL}
        actionPendingLabel={CMS_SLOTS_ENGINE_CREATE_TARGET_PENDING_LABEL}
        actionVariant="default"
        disabled={ctaDisabled}
        label={canvasActionHint}
        labelEmphasis="hint"
        onAction={() => void onCreateListTarget()}
        pending={listTargetCreatePending}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
        {CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL}
      </Button>
    </>
  );
}

function CmsSlotEnginePendingActions(props: {
  canvasActionHint: string;
  listTargetPhase: "loading" | "updating";
  onBackToList: () => void;
}) {
  const { canvasActionHint, listTargetPhase, onBackToList } = props;

  return (
    <>
      <SurfaceSummaryCardCanvasActionRow
        actionLabel={
          listTargetPhase === "updating"
            ? CMS_SLOTS_ENGINE_LIST_TARGET_UPDATING_LABEL
            : CMS_SLOTS_ENGINE_LIST_TARGET_CHECKING_LABEL
        }
        disabled
        label={canvasActionHint}
        labelEmphasis="hint"
        onAction={() => {}}
        pending
      />
      <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
        {CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL}
      </Button>
    </>
  );
}

export function CmsSlotEngineListContextSection(props: CmsSlotEngineListContextSectionProps) {
  const {
    activeDataList,
    activeListLabel,
    removingKey,
    listTargetPhase,
    listTargetActionBusy,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetFocusOnCanvasPending,
    listTargetPlaceOnCanvasPending,
    listTargetOnCanvasCount,
    listTargetOnCanvasCountResolved,
    onBackToList,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onFocusListTargetOnCanvas,
    onPlaceListTargetOnCanvas,
  } = props;

  const ctaDisabled = listTargetActionBusy || removingKey !== null || activeDataList == null;
  const canvasActionHint = resolveCanvasActionHint(listTargetPhase, listTargetOnCanvasCount);
  const listTargetCanvasStatusPending =
    listTargetPhase === "loading" ||
    listTargetPhase === "updating" ||
    (listTargetPhase === "synced" && !listTargetOnCanvasCountResolved);
  const syncedMenuItems =
    listTargetPhase === "synced"
      ? buildSyncedListTargetMenuItems({
          listTargetOnCanvasCount,
          listTargetFocusOnCanvasPending,
          onFocusListTargetOnCanvas,
          onRequestRemoveListTarget,
        })
      : [];

  return (
    <SurfaceSummaryCardFormFields>
      <SurfaceSummaryCardPageIntro
        description={CMS_SLOTS_ENGINE_EDITING_DESCRIPTION}
        title={CMS_SLOTS_ENGINE_EDITING_TITLE}
      />

      {activeDataList != null && activeListLabel != null ? (
        <CmsSlotEngineCurrentListSummary
          activeListLabel={activeListLabel}
          actionsMenuAriaLabel={
            listTargetPhase === "synced" ? cmsSlotsEngineListTargetActionsAriaLabel(activeListLabel) : undefined
          }
          actionsMenuDisabled={ctaDisabled || listTargetRemovePending}
          actionsMenuItems={syncedMenuItems}
        />
      ) : null}

      {listTargetPhase === "synced" && listTargetOnCanvasCountResolved && listTargetOnCanvasCount === 0 ? (
        <CmsSlotEnginePlaceOnCanvasAction
          canvasActionHint={canvasActionHint}
          ctaDisabled={ctaDisabled}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
        />
      ) : null}

      {listTargetPhase === "absent" ? (
        <CmsSlotEngineAbsentActions
          canvasActionHint={canvasActionHint}
          ctaDisabled={ctaDisabled}
          listTargetCreatePending={listTargetCreatePending}
          onBackToList={onBackToList}
          onCreateListTarget={onCreateListTarget}
        />
      ) : null}

      {listTargetCanvasStatusPending ? (
        <CmsSlotEnginePendingActions
          canvasActionHint={canvasActionHint}
          listTargetPhase={listTargetPhase === "updating" ? "updating" : "loading"}
          onBackToList={onBackToList}
        />
      ) : null}
    </SurfaceSummaryCardFormFields>
  );
}
