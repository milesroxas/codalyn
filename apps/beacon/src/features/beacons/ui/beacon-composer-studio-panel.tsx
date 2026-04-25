import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";
import { type DragEvent, Fragment, useState } from "react";
import type { BeaconCompositionDraftRow, BeaconPaletteEntry } from "@/features/beacons/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

type BeaconComposerStudioPanelProps = {
  activeDataList: string;
  draft: BeaconCompositionDraftRow[];
  dirty: boolean;
  /** Shown in Target order when the list is empty and CMS state calls for a specific explanation. */
  emptyTargetOrderHint: string | null;
  /** Component types present in the Engine-defined beacon list; Composer can only add from this set. */
  allowedPalette: BeaconPaletteEntry[];
  onAddFromPalette: (c: BeaconPaletteEntry) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onSave: () => void;
  savePending: boolean;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
};

type ComposerDropTargetProps = {
  slot: number;
  dragActive: boolean;
  highlighted: boolean;
  busy: boolean;
  onSetDropSlot: (slot: number) => void;
  onDropAtSlot: (slot: number, e: DragEvent<HTMLElement>) => void;
};

function ComposerDropTarget(props: ComposerDropTargetProps) {
  const { slot, dragActive, highlighted, busy, onSetDropSlot, onDropAtSlot } = props;
  return (
    <li data-slot="beacon_composer_drop_target">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!dragActive}
        className={cn(
          "relative block h-2 w-full rounded-sm transition-colors",
          dragActive ? "opacity-100" : "opacity-0",
          highlighted && "bg-primary/12"
        )}
        onDragOver={(e: DragEvent<HTMLButtonElement>) => {
          if (busy) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onSetDropSlot(slot);
        }}
        onDrop={(e: DragEvent<HTMLButtonElement>) => onDropAtSlot(slot, e)}
      >
        <span
          className={cn(
            "absolute inset-x-1 top-1/2 h-px -translate-y-1/2 rounded-full transition-colors",
            dragActive ? "bg-border" : "bg-transparent",
            highlighted && "h-0.5 bg-primary"
          )}
        />
      </button>
    </li>
  );
}

type ComposerOrderSectionProps = {
  draft: BeaconCompositionDraftRow[];
  emptyWhenNoSavedOrderHint: string | null;
  allowedPaletteCount: number;
  busy: boolean;
  dragActive: boolean;
  draggingKey: string | null;
  dropSlotIndex: number | null;
  onSetDropSlot: (slot: number) => void;
  onDropAtSlot: (slot: number, e: DragEvent<HTMLElement>) => void;
  onDragStart: (key: string, index: number, e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onRemove: (key: string) => void;
};

function ComposerOrderSection(props: ComposerOrderSectionProps) {
  const {
    draft,
    emptyWhenNoSavedOrderHint,
    allowedPaletteCount,
    busy,
    dragActive,
    draggingKey,
    dropSlotIndex,
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
            {draft.map((row, index) => (
              <Fragment key={row.key}>
                <ComposerDropTarget
                  slot={index}
                  dragActive={dragActive}
                  highlighted={dropSlotIndex === index}
                  busy={busy}
                  onSetDropSlot={onSetDropSlot}
                  onDropAtSlot={onDropAtSlot}
                />
                <li>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border/70 bg-card px-2 py-1.5",
                      draggingKey === row.key && "border-primary/50 bg-primary/5 opacity-70"
                    )}
                  >
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
                </li>
              </Fragment>
            ))}
            <ComposerDropTarget
              slot={draft.length}
              dragActive={dragActive}
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

type ComposerPaletteSectionProps = {
  allowedPalette: BeaconPaletteEntry[];
  busy: boolean;
  onAddFromPalette: (c: BeaconPaletteEntry) => void;
};

function ComposerPaletteSection(props: ComposerPaletteSectionProps) {
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

export function BeaconComposerStudioPanel(props: BeaconComposerStudioPanelProps) {
  const {
    activeDataList,
    draft,
    dirty,
    emptyTargetOrderHint,
    allowedPalette,
    onAddFromPalette,
    onReorder,
    onRemove,
    onBack,
    onSave,
    savePending,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    embedSyncPending,
    onSyncInstallEmbed,
  } = props;

  const busy = savePending || embedSyncPending;
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropSlotIndex, setDropSlotIndex] = useState<number | null>(null);
  const dragActive = draggingKey != null;

  const resetDragState = () => {
    setDraggingKey(null);
    setDropSlotIndex(null);
  };

  const handleDropAtSlot = (slot: number, e: DragEvent<HTMLElement>) => {
    if (busy) return;
    e.preventDefault();
    const fromKey = e.dataTransfer.getData("text/plain") || draggingKey;
    if (!fromKey) {
      resetDragState();
      return;
    }
    const fromIndex = draft.findIndex((row) => row.key === fromKey);
    if (fromIndex < 0) {
      resetDragState();
      return;
    }
    const toIndex = fromIndex < slot ? slot - 1 : slot;
    if (toIndex !== fromIndex && toIndex >= 0 && toIndex <= draft.length - 1) {
      onReorder(fromIndex, toIndex);
    }
    resetDragState();
  };

  const handleDragStart = (key: string, index: number, e: DragEvent<HTMLButtonElement>) => {
    setDraggingKey(key);
    setDropSlotIndex(index);
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (typeof window === "undefined") {
      resetDragState();
      return;
    }
    // In embedded Designer contexts, `dragend` can fire before `drop`; defer clear by one frame.
    window.requestAnimationFrame(() => {
      resetDragState();
    });
  };

  return (
    <div className="space-y-3" data-slot="beacon_composer_studio">
      {!pageRuntimeStatusLoading && !pageRuntimeSynced ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-2 py-1.5"
          data-slot="beacon_composer_runtime_alert"
          role="alert"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <p className="text-xs text-muted-foreground">
              {pageRuntimeSyncReason ?? "Sync page script before saving."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={embedSyncPending}
            aria-busy={embedSyncPending}
            onClick={() => void onSyncInstallEmbed()}
          >
            {embedSyncPending ? "Syncing…" : "Sync"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Studio</p>
          <code className="mt-0.5 block truncate font-mono text-[0.7rem] text-muted-foreground">{activeDataList}</code>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onBack()}>
            Back
          </Button>
          <Button type="button" size="sm" disabled={!dirty || busy || draft.length === 0} onClick={() => void onSave()}>
            {savePending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        Drag to set order. Remove items with trash. On a CMS collection template, Save writes the order to the current
        item’s CMS text field and page script — it does not add or rearrange components in the Engine reference list.
      </p>

      <ComposerOrderSection
        draft={draft}
        emptyWhenNoSavedOrderHint={emptyTargetOrderHint}
        allowedPaletteCount={allowedPalette.length}
        busy={busy}
        dragActive={dragActive}
        draggingKey={draggingKey}
        dropSlotIndex={dropSlotIndex}
        onSetDropSlot={setDropSlotIndex}
        onDropAtSlot={handleDropAtSlot}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onRemove={onRemove}
      />

      <ComposerPaletteSection allowedPalette={allowedPalette} busy={busy} onAddFromPalette={onAddFromPalette} />
    </div>
  );
}
