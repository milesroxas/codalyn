import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";
import { type DragEvent, Fragment, useCallback, useRef, useState } from "react";
import type { BeaconCompositionDraftRow, BeaconPaletteEntry } from "@/features/beacons/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

/** Carried in dataTransfer; some embedded / iframe DnD contexts are flaky with `text/plain` only. */
const DND_MIME = "application/x-codalyn-beacon-composer-reorder";

function readDraggedKeyFromTransfer(t: DataTransfer | null, fallback: string | null) {
  if (t == null) return fallback;
  const a = t.getData("text/plain");
  if (a) return a;
  const b = t.getData(DND_MIME);
  return b || fallback;
}

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
  /** Ref-backed; true before React re-renders after drag start (avoids a dead first frame on gaps). */
  reorderInProgress: () => boolean;
  highlighted: boolean;
  busy: boolean;
  onSetDropSlot: (slot: number) => void;
  onDropAtSlot: (slot: number, e: DragEvent<HTMLElement>) => void;
};

function ComposerDropTarget(props: ComposerDropTargetProps) {
  const { slot, dragActive, reorderInProgress, highlighted, busy, onSetDropSlot, onDropAtSlot } = props;
  const showReorderChrome = dragActive || reorderInProgress();
  return (
    <li data-slot="beacon_composer_drop_target" className="shrink-0 list-none">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!showReorderChrome}
        className={cn(
          "relative block w-full rounded-md transition-colors",
          /* Larger hit target while dragging; thin spacer when idle */
          showReorderChrome ? "min-h-4 border-2 border-dashed py-0.5" : "min-h-1.5 border-0 p-0 pointer-events-none",
          showReorderChrome && !highlighted && "border-border/80 bg-muted/30",
          highlighted && "border-primary bg-primary/15 shadow-sm"
        )}
        onDragOver={(e: DragEvent<HTMLButtonElement>) => {
          if (busy) return;
          if (!reorderInProgress()) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onSetDropSlot(slot);
        }}
        onDrop={(e: DragEvent<HTMLButtonElement>) => onDropAtSlot(slot, e)}
      >
        <span
          className={cn(
            "pointer-events-none block min-h-px w-full rounded-full transition-all",
            showReorderChrome && !highlighted && "h-0.5 bg-border/90",
            highlighted && "h-1 bg-primary"
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
  /** True while a handle-initiated reorder drag is in progress (read synchronously; not React state). */
  isReorderInProgress: () => boolean;
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
            {draft.map((row, index) => (
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

  /** Synchronous drag identity; React state in drop can lag a frame. */
  const dragKeyRef = useRef<string | null>(null);
  /** `drop` ran (even if it was a no-op). Cleared after dragend handles cancel vs success. */
  const dropEventHandledRef = useRef(false);

  const isReorderInProgress = useCallback(() => dragKeyRef.current != null, []);

  const resetDragState = useCallback(() => {
    dragKeyRef.current = null;
    setDraggingKey(null);
    setDropSlotIndex(null);
  }, []);

  const handleDropAtSlot = (slot: number, e: DragEvent<HTMLElement>) => {
    if (busy) return;
    e.preventDefault();
    dropEventHandledRef.current = true;
    const fromKey = readDraggedKeyFromTransfer(e.dataTransfer, dragKeyRef.current);
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
    dropEventHandledRef.current = false;
    dragKeyRef.current = key;
    setDraggingKey(key);
    setDropSlotIndex(index);
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.setData(DND_MIME, key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (typeof window === "undefined") {
      resetDragState();
      return;
    }
    // `drop` must run in the same task before microtasks; if not (some embedded hosts), we still
    // must not clear `dragKeyRef` until after a microtask so a late `drop` can read it.
    queueMicrotask(() => {
      if (!dropEventHandledRef.current) {
        resetDragState();
      }
      dropEventHandledRef.current = false;
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
        isReorderInProgress={isReorderInProgress}
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
