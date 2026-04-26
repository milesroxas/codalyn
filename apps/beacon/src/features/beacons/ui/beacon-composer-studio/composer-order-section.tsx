import { Copy, GripVertical, Trash2 } from "lucide-react";
import { type DragEvent, Fragment } from "react";
import { copyBeaconInstancePropId } from "@/features/beacons/model/beacon-composer-clipboard";
import type { BeaconComposerRowMeta } from "@/features/beacons/model/beacon-composer-row-meta";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ComposerDropTarget } from "./composer-drop-target";
import { StudioPropValueField } from "./studio-prop-value-field";

type ComposerOrderSectionProps = {
  draft: BeaconCompositionDraftRow[];
  rowMeta: BeaconComposerRowMeta[];
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  emptyWhenNoSavedOrderHint: string | null;
  allowedPaletteCount: number;
  busy: boolean;
  dragActive: boolean;
  draggingKey: string | null;
  dropSlotIndex: number | null;
  /** True while a handle-initiated reorder drag is in progress (read synchronously; not React state). */
  isReorderInProgress: () => boolean;
  onSetDropSlot: (slot: number) => void;
  onDropAtSlot: (slot: number, e: DragEvent<HTMLElement>) => void;
  onDragStart: (key: string, index: number, e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onRemove: (key: string) => void;
};

export function ComposerOrderSection(props: ComposerOrderSectionProps) {
  const {
    draft,
    rowMeta,
    onChangePropValue,
    emptyWhenNoSavedOrderHint,
    allowedPaletteCount,
    busy,
    dragActive,
    draggingKey,
    dropSlotIndex,
    isReorderInProgress,
    onSetDropSlot,
    onDropAtSlot,
    onDragStart,
    onDragEnd,
    onRemove,
  } = props;

  return (
    <section
      className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5"
      data-slot="beacon_composer_order"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Target order</p>
        <p className="text-xs text-muted-foreground">
          {draft.length} {draft.length === 1 ? "item" : "items"}
        </p>
      </div>

      {draft.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background px-2.5 py-3 text-sm text-muted-foreground">
          {emptyWhenNoSavedOrderHint != null && emptyWhenNoSavedOrderHint !== "" ? (
            <span className="block leading-snug">{emptyWhenNoSavedOrderHint}</span>
          ) : allowedPaletteCount > 0 ? (
            "Add components from the palette below."
          ) : (
            "No component types in this list yet. Add list items in Engine first."
          )}
        </div>
      ) : (
        <ScrollArea className="h-[min(48vh,22rem)] rounded-md border border-border/70 bg-background">
          <ul className="m-0 list-none p-2" aria-label="Composition order">
            {draft.map((row, index) => {
              const meta = rowMeta[index];
              const exposed = meta?.exposed ?? [];
              const pvals = row.propValues ?? {};
              return (
                <Fragment key={row.key}>
                  <ComposerDropTarget
                    slot={index}
                    dragActive={dragActive}
                    reorderInProgress={isReorderInProgress}
                    highlighted={dropSlotIndex === index}
                    busy={busy}
                    onSetDropSlot={onSetDropSlot}
                    onDropAtSlot={onDropAtSlot}
                  />
                  <li
                    className="shrink-0"
                    onDragOver={(e: DragEvent<HTMLLIElement>) => {
                      if (busy) return;
                      if (!isReorderInProgress()) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const r = e.currentTarget.getBoundingClientRect();
                      const before = e.clientY - r.top < r.height / 2;
                      onSetDropSlot(before ? index : index + 1);
                    }}
                    onDrop={(e: DragEvent<HTMLLIElement>) => {
                      if (busy) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      const before = e.clientY - r.top < r.height / 2;
                      onDropAtSlot(before ? index : index + 1, e);
                    }}
                  >
                    <div
                      className={cn(
                        "space-y-1.5 rounded-md border border-border/70 bg-card px-2 py-1.5",
                        draggingKey === row.key && "border-primary/50 bg-primary/5 opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:pointer-events-none disabled:opacity-40"
                          disabled={busy}
                          draggable={!busy}
                          aria-label={`Drag to reorder ${row.name}`}
                          onDragStart={(e: DragEvent<HTMLButtonElement>) => onDragStart(row.key, index, e)}
                          onDragEnd={onDragEnd}
                        >
                          <GripVertical className="size-4" aria-hidden />
                        </button>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="shrink-0 text-destructive hover:bg-destructive/10"
                          aria-label={`Remove ${row.name}`}
                          disabled={busy}
                          onClick={() => onRemove(row.key)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                      {exposed.length > 0 ? (
                        <div
                          className="space-y-1.5 border-t border-border/50 pt-1.5"
                          data-slot="beacon_studio_prop_fields"
                        >
                          {exposed.map((ep) => {
                            const v = pvals[ep.propId] ?? "";
                            const fieldId = `beacon-studio-${row.key}-${ep.propId}`;
                            return (
                              <div key={ep.propId} className="space-y-0.5">
                                <div className="flex items-start justify-between gap-1.5">
                                  <Label className="text-xs text-muted-foreground" htmlFor={fieldId}>
                                    {ep.label}
                                    <span className="ml-1.5 font-mono text-[0.6rem] font-normal text-muted-foreground/90">
                                      {ep.valueType}
                                    </span>
                                  </Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="shrink-0 text-muted-foreground"
                                    disabled={busy}
                                    aria-label={`Copy prop id for ${ep.label}`}
                                    onClick={() => void copyBeaconInstancePropId(ep.propId)}
                                  >
                                    <Copy className="size-3.5" aria-hidden />
                                  </Button>
                                </div>
                                <p
                                  className="truncate font-mono text-[0.6rem] text-muted-foreground/90"
                                  title={ep.propId}
                                >
                                  {ep.propId}
                                </p>
                                <StudioPropValueField
                                  inputId={fieldId}
                                  ep={ep}
                                  value={v}
                                  busy={busy}
                                  onChange={(next) => onChangePropValue(row.key, ep.propId, next)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </li>
                </Fragment>
              );
            })}
            <ComposerDropTarget
              slot={draft.length}
              dragActive={dragActive}
              reorderInProgress={isReorderInProgress}
              highlighted={dropSlotIndex === draft.length}
              busy={busy}
              onSetDropSlot={onSetDropSlot}
              onDropAtSlot={onDropAtSlot}
            />
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
