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
    onSetSlotExposed,
    onResyncDesignerSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
  } = props;

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
              publishedDisplayName={designerPublishedDisplayNames?.[slotIndex] ?? row.name}
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
