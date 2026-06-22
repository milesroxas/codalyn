import { Layers } from "lucide-react";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE,
  CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { DrawerScrollList, DrawerScrollListAddActionGroup } from "@/shared/ui/drawer-scroll-list";

export type ComposerPaletteListProps = {
  allowedPalette: CmsSlotPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
};

/** A component palette entry with the variant entries that share its component id nested under it. */
type PaletteGroup = {
  key: string;
  base: CmsSlotPaletteEntry;
  variants: CmsSlotPaletteEntry[];
};

/** Groups flat palette entries so each component owns its variant entries (matched by component id). */
function groupPaletteEntries(entries: CmsSlotPaletteEntry[]): PaletteGroup[] {
  const variantsByComponent = new Map<string, CmsSlotPaletteEntry[]>();
  for (const entry of entries) {
    if (entry.variant != null) {
      const list = variantsByComponent.get(entry.componentId) ?? [];
      list.push(entry);
      variantsByComponent.set(entry.componentId, list);
    }
  }
  const baseComponentIds = new Set(entries.filter((e) => e.variant == null).map((e) => e.componentId));
  const consumed = new Set<string>();
  const groups: PaletteGroup[] = [];
  for (const entry of entries) {
    if (entry.variant == null) {
      const variants = consumed.has(entry.componentId) ? [] : (variantsByComponent.get(entry.componentId) ?? []);
      consumed.add(entry.componentId);
      groups.push({ key: entry.poolKey, base: entry, variants });
    } else if (!baseComponentIds.has(entry.componentId)) {
      // Orphan variant with no base entry — surface it on its own so it is never hidden.
      groups.push({ key: entry.poolKey, base: entry, variants: [] });
    }
  }
  return groups;
}

function paletteEntryTitle(entry: CmsSlotPaletteEntry): string | undefined {
  return entry.group ? `${entry.name} · ${entry.group}` : undefined;
}

export function ComposerPaletteList(props: ComposerPaletteListProps) {
  const { allowedPalette, busy, onAddFromPalette } = props;
  const isEmpty = allowedPalette.length === 0;
  const groups = groupPaletteEntries(allowedPalette);

  return (
    <DrawerScrollList
      aria-label={CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL}
      data-slot="beacon_composer_add_body"
      isEmpty={isEmpty}
      emptyContent={
        <CmsSlotsPanelEmptyState
          data-slot="cms_slots_composer_palette_empty"
          icon={Layers}
          title={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE}
          description={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION}
        />
      }
    >
      {groups.map((group) => (
        <DrawerScrollListAddActionGroup
          key={group.key}
          base={{
            label: group.base.name,
            disabled: busy,
            title: paletteEntryTitle(group.base),
            ariaLabel: `Add ${group.base.name}`,
            onClick: () => onAddFromPalette(group.base),
          }}
          variants={group.variants.map((variant) => {
            const variantName = variant.variant?.variantName ?? variant.name;
            return {
              id: variant.poolKey,
              label: variantName,
              disabled: busy,
              ariaLabel: `Add ${variant.name} ${variantName}`,
              onClick: () => onAddFromPalette(variant),
            };
          })}
        />
      ))}
    </DrawerScrollList>
  );
}
