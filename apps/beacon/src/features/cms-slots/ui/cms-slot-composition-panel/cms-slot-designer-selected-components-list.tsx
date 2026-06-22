import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotDesignerSlotPropsFile } from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CMS_SLOTS_DESIGNER_SELECTED_COMPONENTS_ARIA_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { CmsSlotDesignerSelectedRow } from "./cms-slot-designer-selected-row";

const cmsSlotDesignerSelectedComponentsListShellClass =
  "overflow-hidden rounded-[10px] border border-border/70 bg-card text-card-foreground shadow-sm";
const cmsSlotDesignerSelectedComponentsListScrollAreaClass = "max-h-60";
const cmsSlotDesignerSelectedComponentsListClass = "m-0 list-none divide-y divide-border/80 p-0";

type CmsSlotDesignerSelectedComponentsListProps = {
  selected: HydratedCmsSlotRow[];
  composableByKey: Record<string, ComposableInstancePropMeta[]>;
  composableLoading: boolean;
  designerSlotProps: CmsSlotDesignerSlotPropsFile;
  designerPublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
  addPending: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingDesignerSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>;
  settingVariantKey: string | null;
  onAddVariant: (row: HydratedCmsSlotRow) => void | Promise<void>;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncDesignerSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
};

export function CmsSlotDesignerSelectedComponentsList(props: CmsSlotDesignerSelectedComponentsListProps) {
  const {
    selected,
    composableByKey,
    composableLoading,
    designerSlotProps,
    designerPublishedDisplayNames,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    addPending,
    removingKey,
    listTargetActionBusy,
    resyncingDesignerSlotKey,
    onRemove,
    onSetSeedVariant,
    settingVariantKey,
    onAddVariant,
    onSetSlotExposed,
    onResyncDesignerSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
  } = props;

  // The published names are resolved asynchronously and can lag a `selected` change by a render. Using a stale array
  // would index into a different row and show the wrong component name (e.g. "Heading"); only trust it when its length
  // matches the current rows.
  const publishedNames =
    designerPublishedDisplayNames != null && designerPublishedDisplayNames.length === selected.length
      ? designerPublishedDisplayNames
      : null;

  return (
    <div className={cmsSlotDesignerSelectedComponentsListShellClass} data-slot="cms_slots_selected_components">
      <ScrollArea className={cmsSlotDesignerSelectedComponentsListScrollAreaClass}>
        <ul
          className={cmsSlotDesignerSelectedComponentsListClass}
          aria-label={CMS_SLOTS_DESIGNER_SELECTED_COMPONENTS_ARIA_LABEL}
        >
          {selected.map((row, slotIndex) => (
            <CmsSlotDesignerSelectedRow
              key={row.key}
              row={row}
              slotIndex={slotIndex}
              publishedDisplayName={publishedNames?.[slotIndex] ?? row.name}
              onRenamePublishedDisplayName={onRenamePublishedDisplayName}
              renamingPublishedSlotKey={renamingPublishedSlotKey}
              available={composableByKey[row.key] ?? []}
              slotExposed={designerSlotProps.slots[slotIndex]?.exposed ?? []}
              composableLoading={composableLoading}
              composableMetaReady={!composableLoading && row.key in composableByKey}
              addPending={addPending}
              removingKey={removingKey}
              listTargetActionBusy={listTargetActionBusy}
              resyncingDesignerSlotKey={resyncingDesignerSlotKey}
              onRemove={onRemove}
              onSetSeedVariant={onSetSeedVariant}
              settingVariantKey={settingVariantKey}
              onAddVariant={onAddVariant}
              onSetSlotExposed={onSetSlotExposed}
              onResyncDesignerSlotAttrs={onResyncDesignerSlotAttrs}
              autoOpenExposeDrawerRowKey={autoOpenExposeDrawerRowKey}
              onAutoOpenExposeDrawerConsumed={onAutoOpenExposeDrawerConsumed}
            />
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
