import { cva } from "class-variance-authority";
import { Layers, Plus } from "lucide-react";
import { useId } from "react";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";

type ComposerPaletteSectionProps = {
  allowedPalette: CmsSlotPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: CmsSlotPaletteEntry) => void;
  /**
   * `card` — inset rounded panel (default).
   * `docked` — full-width strip with solid theme background (`bg-background`) flush above the app footer.
   */
  variant?: "card" | "docked";
};

const composerPaletteSectionVariants = cva("space-y-2", {
  variants: {
    variant: {
      card: "rounded-sm border border-border/70 bg-muted/20 p-2.5",
      docked: "w-full shrink-0 border-t border-border bg-background px-3 pt-2.5 pb-2.5",
    },
  },
  defaultVariants: {
    variant: "card",
  },
});

const composerPaletteSectionHeadingVariants = cva("w-full text-center text-xs font-medium text-muted-foreground");

const composerPaletteSectionBodyVariants = cva("py-2");

const composerPaletteSectionGridVariants = cva(
  "scrollbar-themed m-0 grid max-h-[min(34vh,14rem)] list-none grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain p-0 sm:grid-cols-3"
);

export function ComposerPaletteSection(props: ComposerPaletteSectionProps) {
  const { allowedPalette, busy, onAddFromPalette, variant = "card" } = props;
  const headingId = useId();

  return (
    <section
      className={composerPaletteSectionVariants({ variant })}
      data-slot="beacon_composer_add"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className={composerPaletteSectionHeadingVariants()}>
        Add components
      </h3>
      <div className={composerPaletteSectionBodyVariants()} data-slot="beacon_composer_add_body">
        {allowedPalette.length === 0 ? (
          <CmsSlotsPanelEmptyState
            data-slot="cms_slots_composer_palette_empty"
            icon={Layers}
            title={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_TITLE}
            description={CMS_SLOTS_COMPOSER_PALETTE_EMPTY_DESCRIPTION}
          />
        ) : (
          <ul className={composerPaletteSectionGridVariants()} aria-label="Allowed component types for this list">
            {allowedPalette.map((c) => (
              <li key={c.id} className="contents">
                <Button
                  type="button"
                  variant="composerPaletteTile"
                  size="composerPaletteTile"
                  disabled={busy}
                  title={c.group ? `${c.name} · ${c.group}` : undefined}
                  onClick={() => onAddFromPalette(c)}
                >
                  <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
                  {c.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
