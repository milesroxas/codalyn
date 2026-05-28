import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { CmsSlotEngineSlotPropsFile } from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { CMS_SLOTS_ENGINE_SELECTED_COMPONENTS_ARIA_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { CmsSlotEngineSelectedRow } from "./cms-slot-engine-selected-row";

const cmsSlotEngineSelectedComponentsListShellClass =
  "overflow-hidden rounded-[10px] border border-border/70 bg-card text-card-foreground shadow-sm";
const cmsSlotEngineSelectedComponentsListScrollAreaClass = "max-h-60";
const cmsSlotEngineSelectedComponentsListClass = "m-0 list-none divide-y divide-border/80 p-0";

type CmsSlotEngineSelectedComponentsListProps = {
  selected: HydratedCmsSlotRow[];
  composableByKey: Record<string, ComposableInstancePropMeta[]>;
  composableLoading: boolean;
  engineSlotProps: CmsSlotEngineSlotPropsFile;
  enginePublishedDisplayNames: string[] | null;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
  addPending: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingEngineSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncEngineSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
};

export function CmsSlotEngineSelectedComponentsList(props: CmsSlotEngineSelectedComponentsListProps) {
  const {
    selected,
    composableByKey,
    composableLoading,
    engineSlotProps,
    enginePublishedDisplayNames,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    addPending,
    removingKey,
    listTargetActionBusy,
    resyncingEngineSlotKey,
    onRemove,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
  } = props;

  return (
    <div className={cmsSlotEngineSelectedComponentsListShellClass} data-slot="cms_slots_selected_components">
      <ScrollArea className={cmsSlotEngineSelectedComponentsListScrollAreaClass}>
        <ul
          className={cmsSlotEngineSelectedComponentsListClass}
          aria-label={CMS_SLOTS_ENGINE_SELECTED_COMPONENTS_ARIA_LABEL}
        >
          {selected.map((row, slotIndex) => (
            <CmsSlotEngineSelectedRow
              key={row.key}
              row={row}
              slotIndex={slotIndex}
              publishedDisplayName={enginePublishedDisplayNames?.[slotIndex] ?? row.name}
              onRenamePublishedDisplayName={onRenamePublishedDisplayName}
              renamingPublishedSlotKey={renamingPublishedSlotKey}
              available={composableByKey[row.key] ?? []}
              slotExposed={engineSlotProps.slots[slotIndex]?.exposed ?? []}
              composableLoading={composableLoading}
              composableMetaReady={!composableLoading && row.key in composableByKey}
              addPending={addPending}
              removingKey={removingKey}
              listTargetActionBusy={listTargetActionBusy}
              resyncingEngineSlotKey={resyncingEngineSlotKey}
              onRemove={onRemove}
              onSetSlotExposed={onSetSlotExposed}
              onResyncEngineSlotAttrs={onResyncEngineSlotAttrs}
              autoOpenExposeDrawerRowKey={autoOpenExposeDrawerRowKey}
              onAutoOpenExposeDrawerConsumed={onAutoOpenExposeDrawerConsumed}
            />
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
