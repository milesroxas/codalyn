import { Layers } from "lucide-react";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE,
  CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { DrawerScrollList, DrawerScrollListAddActionRow } from "@/shared/ui/drawer-scroll-list";

export type ComposerPaletteListProps = {
  allowedPalette: CmsSlotPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
};

export function ComposerPaletteList(props: ComposerPaletteListProps) {
  const { allowedPalette, busy, onAddFromPalette } = props;
  const isEmpty = allowedPalette.length === 0;

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
      {allowedPalette.map((entry) => {
        const label = entry.group ? `${entry.name} · ${entry.group}` : entry.name;

        return (
          <DrawerScrollListAddActionRow
            key={entry.poolKey}
            label={entry.name}
            disabled={busy}
            title={entry.group ? label : undefined}
            ariaLabel={`Add ${entry.name}`}
            onClick={() => onAddFromPalette(entry)}
          />
        );
      })}
    </DrawerScrollList>
  );
}
