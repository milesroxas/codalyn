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
/**
 * Variants of a component, nested under its row: a single vertical guide rail (no background or separators) so they read
 * as children of the same item. `ml-4` centers the rail under the first glyph of the component name (which starts at
 * the row's `px-3` inset), the way nested-list guides do. `pl-1` keeps the gap from the rail; the rest of the variant
 * row's inset lives on the row button so its hover background gains breathing room without shifting the text. No
 * negative top margin — overlapping the base row would let its full-bleed hover bleed into the first variant.
 */
const cmsSlotDesignerNestedVariantListClass = "m-0 mb-1 ml-4 list-none border-l border-border/70 p-0 pr-1 pl-1";

/** One displayed component: its base/top-level row plus any variant rows pinned to the same component id. */
type SelectedComponentGroup = {
  key: string;
  base: { row: HydratedCmsSlotRow; slotIndex: number };
  variants: { row: HydratedCmsSlotRow; slotIndex: number }[];
};

/**
 * Groups the flat `selected` rows for display: the first-added row of each component is the parent/top-level row, and any
 * later rows of the same component are its nested variants (variants are appended to `selected` on add, not kept
 * adjacent). The parent stays the parent even when its variant dropdown pins it to a specific variant — so its variant
 * picker is never hidden. `slotIndex` is preserved as the original index into `selected`, since the designer slot-props
 * file is indexed by it.
 */
function groupSelectedRows(selected: HydratedCmsSlotRow[]): SelectedComponentGroup[] {
  const entries = selected.map((row, slotIndex) => ({ row, slotIndex }));
  const order: string[] = [];
  const byComponent = new Map<string, { row: HydratedCmsSlotRow; slotIndex: number }[]>();
  for (const entry of entries) {
    const list = byComponent.get(entry.row.componentId);
    if (list == null) {
      byComponent.set(entry.row.componentId, [entry]);
      order.push(entry.row.componentId);
    } else {
      list.push(entry);
    }
  }
  return order.map((componentId) => {
    const [base, ...variants] = byComponent.get(componentId) ?? [];
    return { key: base.row.key, base, variants };
  });
}

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
  onResyncDesignerSlotAttrs: (slotIndex: number, compositionChanged?: boolean) => boolean | Promise<boolean>;
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
  /** Key of the staged (uncommitted) seed; its row discards itself if its sheet closes before committing. */
  pendingSeedRowKey?: string | null;
  onDiscardPendingSeed: (row: HydratedCmsSlotRow) => void;
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
    pendingSeedRowKey = null,
    onDiscardPendingSeed,
  } = props;

  // The published names are resolved asynchronously and can lag a `selected` change by a render. Using a stale array
  // would index into a different row and show the wrong component name (e.g. "Heading"); only trust it when its length
  // matches the current rows.
  const publishedNames =
    designerPublishedDisplayNames != null && designerPublishedDisplayNames.length === selected.length
      ? designerPublishedDisplayNames
      : null;

  const renderRow = (row: HydratedCmsSlotRow, slotIndex: number, nested: boolean) => (
    <CmsSlotDesignerSelectedRow
      key={row.key}
      row={row}
      slotIndex={slotIndex}
      nested={nested}
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
      pending={pendingSeedRowKey === row.key}
      onDiscardPendingSeed={onDiscardPendingSeed}
    />
  );

  const groups = groupSelectedRows(selected);

  return (
    <div className={cmsSlotDesignerSelectedComponentsListShellClass} data-slot="cms_slots_selected_components">
      <ScrollArea className={cmsSlotDesignerSelectedComponentsListScrollAreaClass}>
        <ul
          className={cmsSlotDesignerSelectedComponentsListClass}
          aria-label={CMS_SLOTS_DESIGNER_SELECTED_COMPONENTS_ARIA_LABEL}
        >
          {groups.map((group) => (
            <li key={group.key}>
              {renderRow(group.base.row, group.base.slotIndex, false)}
              {group.variants.length > 0 ? (
                <ul className={cmsSlotDesignerNestedVariantListClass}>
                  {group.variants.map((variant) => (
                    <li key={variant.row.key}>{renderRow(variant.row, variant.slotIndex, true)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
