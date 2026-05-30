import { Database, FileText, type LucideIcon } from "lucide-react";
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
  /** Composer shows the entry title as primary; Engine shows the collection name. */
  primaryField?: "entry" | "collection";
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

function editingContextIcon(primaryField: "entry" | "collection"): LucideIcon {
  return primaryField === "collection" ? Database : FileText;
}

function ComposerEditingContextReadyBody(props: {
  collectionName: string;
  entryTitle: string | null;
  slotListLabel?: string | null;
  primaryField: "entry" | "collection";
}) {
  const { collectionName, entryTitle, slotListLabel, primaryField } = props;
  const trimmedSlotListLabel = slotListLabel?.trim() ?? "";

  const primaryText =
    primaryField === "collection" ? collectionName : (entryTitle ?? CMS_SLOTS_COMPOSER_EDITING_CONTEXT_NO_ENTRY);
  const secondaryMeta = primaryField === "collection" ? null : formatCollectionMeta(collectionName);
  const showSlotListMeta = trimmedSlotListLabel !== "";
  const ContextIcon = editingContextIcon(primaryField);

  return (
    <SurfaceSummaryCardSurfaceDisplay frame="inset">
      <SurfaceSummaryCardIconBox>
        <ContextIcon aria-hidden strokeWidth={1.75} />
      </SurfaceSummaryCardIconBox>
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle>{primaryText}</SurfaceSummaryCardTitle>
        {secondaryMeta ? <SurfaceSummaryCardMeta>{secondaryMeta}</SurfaceSummaryCardMeta> : null}
        {showSlotListMeta ? (
          <SurfaceSummaryCardMeta emphasis="hint">{formatSlotListMeta(trimmedSlotListLabel)}</SurfaceSummaryCardMeta>
        ) : null}
      </SurfaceSummaryCardIconRowCopy>
    </SurfaceSummaryCardSurfaceDisplay>
  );
}

function ComposerEditingContextBody(props: {
  context: CmsComposerEditingContextViewModel;
  slotListLabel?: string | null;
  primaryField: "entry" | "collection";
}) {
  const { context, slotListLabel, primaryField } = props;
  const showSlotList = composerEditingContextShowsSlotList(slotListLabel);

  if (context.phase === "loading") {
    return (
      <SurfaceSummaryCardSurfaceDisplaySkeleton
        frame="inset"
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
        primaryField={primaryField}
      />
    );
  }

  return null;
}

export function CmsSlotsComposerEditingContextCard(props: CmsSlotsComposerEditingContextCardProps) {
  const { context, slotListLabel, primaryField = "entry" } = props;

  if (context.phase === "idle") {
    return null;
  }

  const sectionLabel =
    primaryField === "collection"
      ? CMS_SLOTS_COMPOSER_EDITING_CONTEXT_COLLECTION_LABEL
      : CMS_SLOTS_COMPOSER_EDITING_CONTEXT_SECTION_LABEL;

  return (
    <SurfaceSummaryCardSurfaceSummary
      data-slot={
        primaryField === "collection" ? "cms_slots_engine_editing_context" : "cms_slots_composer_editing_context"
      }
    >
      <SurfaceSummaryCardPanelSectionLabel>{sectionLabel}</SurfaceSummaryCardPanelSectionLabel>
      <ComposerEditingContextBody context={context} slotListLabel={slotListLabel} primaryField={primaryField} />
    </SurfaceSummaryCardSurfaceSummary>
  );
}
