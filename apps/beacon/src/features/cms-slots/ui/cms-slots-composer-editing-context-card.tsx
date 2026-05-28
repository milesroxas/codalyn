import { Database } from "lucide-react";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import {
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_COLLECTION_LABEL,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_LOADING,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_ENTRY,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_TOWER,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SECTION_LABEL,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SLOT_LIST_LABEL,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_STATIC_PAGE,
  CMS_SLOTS_COMPOSER_EDITING_CONTEXT_UNAVAILABLE,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  SurfaceSummaryCardEmpty,
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceDisplaySkeleton,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type CmsSlotsComposerEditingContextCardProps = {
  context: CmsComposerEditingContextViewModel;
  /** When set, shown as a third line while editing a specific slot list. */
  slotListLabel?: string | null;
};

function formatCollectionMeta(collectionName: string): string {
  return `${CMS_SLOTS_COMPOSER_EDITING_CONTEXT_COLLECTION_LABEL} · ${collectionName}`;
}

function formatSlotListMeta(slotListLabel: string): string {
  return `${CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SLOT_LIST_LABEL} · ${slotListLabel}`;
}

function composerEditingContextShowsSlotList(slotListLabel: string | null | undefined): boolean {
  return slotListLabel != null && slotListLabel.trim() !== "";
}

function ComposerEditingContextReadyBody(props: {
  collectionName: string;
  entryTitle: string | null;
  slotListLabel?: string | null;
}) {
  const { collectionName, entryTitle, slotListLabel } = props;
  const trimmedSlotListLabel = slotListLabel?.trim() ?? "";

  return (
    <SurfaceSummaryCardSurfaceDisplay contained>
      <SurfaceSummaryCardIconBox>
        <Database aria-hidden strokeWidth={1.75} />
      </SurfaceSummaryCardIconBox>
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{entryTitle ?? CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_ENTRY}</SurfaceSummaryCardTitle>
        <SurfaceSummaryCardMeta>{formatCollectionMeta(collectionName)}</SurfaceSummaryCardMeta>
        {trimmedSlotListLabel !== "" ? (
          <SurfaceSummaryCardMeta emphasis="hint">{formatSlotListMeta(trimmedSlotListLabel)}</SurfaceSummaryCardMeta>
        ) : null}
      </SurfaceSummaryCardIconRowCopy>
    </SurfaceSummaryCardSurfaceDisplay>
  );
}

function ComposerEditingContextBody(props: {
  context: CmsComposerEditingContextViewModel;
  slotListLabel?: string | null;
}) {
  const { context, slotListLabel } = props;
  const showSlotList = composerEditingContextShowsSlotList(slotListLabel);

  if (context.phase === "loading") {
    return (
      <SurfaceSummaryCardSurfaceDisplaySkeleton
        showSlotList={showSlotList}
        loadingLabel={CMS_SLOTS_COMPOSER_EDITING_CONTEXT_LOADING}
      />
    );
  }

  if (context.phase === "static_page") {
    return <SurfaceSummaryCardEmpty>{CMS_SLOTS_COMPOSER_EDITING_CONTEXT_STATIC_PAGE}</SurfaceSummaryCardEmpty>;
  }

  if (context.phase === "no_tower") {
    return <SurfaceSummaryCardEmpty>{CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_TOWER}</SurfaceSummaryCardEmpty>;
  }

  if (context.phase === "collection_unavailable") {
    return <SurfaceSummaryCardEmpty>{CMS_SLOTS_COMPOSER_EDITING_CONTEXT_UNAVAILABLE}</SurfaceSummaryCardEmpty>;
  }

  if (context.phase === "ready") {
    return (
      <ComposerEditingContextReadyBody
        collectionName={context.collectionName}
        entryTitle={context.entryTitle}
        slotListLabel={slotListLabel}
      />
    );
  }

  return null;
}

export function CmsSlotsComposerEditingContextCard(props: CmsSlotsComposerEditingContextCardProps) {
  const { context, slotListLabel } = props;

  if (context.phase === "idle") {
    return null;
  }

  return (
    <SurfaceSummaryCardSurfaceSummary data-slot="cms_slots_composer_editing_context">
      <SurfaceSummaryCardPanelSectionLabel>
        {CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SECTION_LABEL}
      </SurfaceSummaryCardPanelSectionLabel>
      <ComposerEditingContextBody context={context} slotListLabel={slotListLabel} />
    </SurfaceSummaryCardSurfaceSummary>
  );
}
