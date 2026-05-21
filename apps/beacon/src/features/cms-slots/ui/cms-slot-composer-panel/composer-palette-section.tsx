import { useId } from "react";
import type { CmsSlotPaletteEntry } from "@/features/cms-slots/model/site-components";
import { cn } from "@/shared/lib/utils";
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

export function ComposerPaletteSection(props: ComposerPaletteSectionProps) {
  const { allowedPalette, busy, onAddFromPalette, variant = "card" } = props;
  const headingId = useId();
  const docked = variant === "docked";

  return (
    <section
      className={cn(
        "space-y-2",
        docked
          ? "w-full shrink-0 border-t border-border bg-background px-3 pt-2.5 pb-2.5"
          : "rounded-sm border border-border/70 bg-muted/20 p-2.5"
      )}
      data-slot="beacon_composer_add"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="text-xs font-medium text-muted-foreground">
        Add components
      </h3>
      {allowedPalette.length === 0 ? (
        <div className="min-h-24 rounded-md border border-dashed border-border bg-background">
          <span className="sr-only">No component types available for this list</span>
        </div>
      ) : (
        <ul
          className="scrollbar-themed m-0 grid max-h-[min(34vh,14rem)] list-none grid-cols-2 gap-2 overflow-y-auto overscroll-contain p-0 sm:grid-cols-3"
          aria-label="Allowed component types for this list"
        >
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
                {c.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
