import { Plus } from "lucide-react";
import type { BeaconPaletteEntry } from "@/features/beacons/model/site-components";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

type ComposerPaletteSectionProps = {
  allowedPalette: BeaconPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: BeaconPaletteEntry) => void;
};

export function ComposerPaletteSection(props: ComposerPaletteSectionProps) {
  const { allowedPalette, busy, onAddFromPalette } = props;

  return (
    <section className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5" data-slot="beacon_composer_add">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add to target</p>
      {allowedPalette.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-2.5 py-3 text-sm text-muted-foreground">
          No component types available for this beacon list.
        </p>
      ) : (
        <ScrollArea className="h-[min(34vh,14rem)] rounded-md border border-border/70 bg-background">
          <ul className="m-0 list-none space-y-1 p-2" aria-label="Allowed component types for this list">
            {allowedPalette.map((c) => (
              <li key={c.id} className="min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full min-w-0 justify-start gap-2 px-2.5 py-2 text-left"
                  onClick={() => onAddFromPalette(c)}
                  disabled={busy}
                >
                  <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium wrap-break-word">{c.name}</span>
                    {c.group ? <span className="block text-xs text-muted-foreground">{c.group}</span> : null}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
