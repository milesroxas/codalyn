import { cva } from "class-variance-authority";
import { Layers, Plus } from "lucide-react";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE,
  CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { ScrollArea } from "@/shared/ui/scroll-area";

export type ComposerPaletteListProps = {
  allowedPalette: CmsSlotPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
};

const composerPaletteListScrollAreaClass = "h-[min(50vh,20rem)] min-w-0";
const composerPaletteListClass = "m-0 list-none p-0";
const composerPaletteListItemClass = "border-b border-border/80 last:border-b-0";

const composerPaletteListItemButtonVariants = cva(
  "flex w-full min-w-0 items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
);

const composerPaletteListItemNameVariants = cva("min-w-0 truncate text-sm font-normal text-foreground");

const composerPaletteListItemAddBadgeVariants = cva(
  "flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
);

type ComposerPaletteListItemProps = {
  entry: CmsSlotPaletteEntry;
  disabled: boolean;
  onAdd: () => void;
};

function ComposerPaletteListItem(props: ComposerPaletteListItemProps) {
  const { entry, disabled, onAdd } = props;
  const label = entry.group ? `${entry.name} · ${entry.group}` : entry.name;

  return (
    <li className={composerPaletteListItemClass}>
      <button
        type="button"
        className={composerPaletteListItemButtonVariants()}
        onClick={() => void onAdd()}
        disabled={disabled}
        title={entry.group ? label : undefined}
        aria-label={`Add ${entry.name}`}
      >
        <span className={composerPaletteListItemNameVariants()}>{entry.name}</span>
        <span className={composerPaletteListItemAddBadgeVariants()} aria-hidden>
          <Plus className="size-2.5 stroke-[1.5]" />
        </span>
      </button>
    </li>
  );
}

export function ComposerPaletteList(props: ComposerPaletteListProps) {
  const { allowedPalette, busy, onAddFromPalette } = props;

  if (allowedPalette.length === 0) {
    return (
      <CmsSlotsPanelEmptyState
        data-slot="cms_slots_composer_palette_empty"
        icon={Layers}
        title={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE}
        description={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION}
      />
    );
  }

  return (
    <ScrollArea className={composerPaletteListScrollAreaClass} data-slot="beacon_composer_add_body">
      <ul className={composerPaletteListClass} aria-label={CMS_SLOTS_COMPOSER_PALETTE_LIST_ARIA_LABEL}>
        {allowedPalette.map((entry) => (
          <ComposerPaletteListItem key={entry.id} entry={entry} disabled={busy} onAdd={() => onAddFromPalette(entry)} />
        ))}
      </ul>
    </ScrollArea>
  );
}
