import { AlertTriangle, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { type DragEvent, Fragment, type ReactElement, useCallback, useMemo, useRef, useState } from "react";
import {
  type BeaconStudioPropFieldKind,
  beaconStudioFieldKindForValueType,
  type ComposableInstancePropMeta,
} from "@/features/beacons/model/beacon-composable-props";
import type { BeaconCompositionDraftRow, BeaconPaletteEntry } from "@/features/beacons/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Textarea } from "@/shared/ui/textarea";

/** Carried in dataTransfer; some embedded / iframe DnD contexts are flaky with `text/plain` only. */
const DND_MIME = "application/x-codalyn-beacon-composer-reorder";

async function copyBeaconInstancePropId(propId: string): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(propId);
    }
    if (typeof webflow !== "undefined" && typeof webflow.notify === "function") {
      void webflow.notify({ type: "Success", message: "Prop id copied to clipboard." });
    }
  } catch {
    if (typeof webflow !== "undefined" && typeof webflow.notify === "function") {
      void webflow.notify({ type: "Error", message: "Could not copy — select and copy the id text manually." });
    }
  }
}

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
  rowMeta: Array<{
    row: BeaconCompositionDraftRow;
    exposed: ComposableInstancePropMeta[];
  }>;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
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
  rowMeta: Array<{
    row: BeaconCompositionDraftRow;
    exposed: ComposableInstancePropMeta[];
  }>;
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

function parseBoolString(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

function colorInputValue(s: string): string {
  const t = s.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
    return t;
  }
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
  }
  return "#000000";
}

/** Normalize stored strings for `<input type="date">` (accepts YYYY-MM-DD or parseable dates). */
function dateInputValue(s: string): string {
  const t = s.trim();
  if (t.length === 0) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return t.slice(0, 10);
  }
  const d = Date.parse(t);
  if (Number.isNaN(d)) {
    return "";
  }
  return new Date(d).toISOString().slice(0, 10);
}

type StudioPropValueFieldProps = {
  inputId: string;
  ep: ComposableInstancePropMeta;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
};

function StudioPropSelectField(
  p: StudioPropValueFieldProps & { options: NonNullable<ComposableInstancePropMeta["selectOptions"]> }
) {
  const { inputId, ep, value, busy, onChange, options } = p;
  const hasValue = value.trim() !== "";
  const valueInList = options.some((o) => o.value === value);
  return (
    <select
      id={inputId}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "md:text-sm"
      )}
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ep.label}
    >
      {!hasValue ? <option value="">—</option> : null}
      {hasValue && !valueInList ? (
        <option value={value}>
          {value}
          {" · not in list"}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const STUDIO_PROP_VALUE_BY_KIND: Record<BeaconStudioPropFieldKind, (p: StudioPropValueFieldProps) => ReactElement> = {
  boolean: ({ inputId, value, busy, onChange }) => (
    <div className="flex items-center gap-2 py-0.5">
      <Checkbox
        id={inputId}
        checked={parseBoolString(value)}
        disabled={busy}
        onCheckedChange={(c) => {
          if (c === "indeterminate") return;
          onChange(c === true ? "true" : "false");
        }}
      />
      <span className="text-xs text-muted-foreground">{parseBoolString(value) ? "Yes" : "No"}</span>
    </div>
  ),
  number: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="number"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  url: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="url"
      inputMode="url"
      autoComplete="url"
      placeholder="https://…"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  email: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="email"
      inputMode="email"
      autoComplete="email"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  tel: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  image: ({ inputId, ep, value, busy, onChange }) => {
    const fileLike = ep.valueType === "file";
    return (
      <Input
        id={inputId}
        className="text-sm"
        type="text"
        inputMode="url"
        placeholder={fileLike ? "File URL or site asset id" : "Image URL or site asset id"}
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
  date: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="date"
      value={dateInputValue(value)}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  color: ({ inputId, ep, value, busy, onChange }) => (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id={inputId}
        className="size-8 cursor-pointer border border-input bg-background disabled:cursor-not-allowed"
        type="color"
        value={colorInputValue(value)}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ep.label}
      />
      <Input
        className="min-w-32 flex-1 text-sm"
        type="text"
        placeholder="#RRGGBB"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
  multiline: ({ inputId, value, busy, onChange }) => (
    <Textarea
      id={inputId}
      className="min-h-16 max-h-40 resize-y text-sm"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  line: ({ inputId, value, busy, onChange }) => (
    <Input
      id={inputId}
      className="text-sm"
      type="text"
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
};

function StudioPropValueField(props: StudioPropValueFieldProps) {
  const { inputId, ep, value, busy, onChange } = props;
  const kind = beaconStudioFieldKindForValueType(ep.valueType);
  const options = ep.selectOptions;

  if (options != null && options.length > 0) {
    return (
      <StudioPropSelectField
        inputId={inputId}
        ep={ep}
        value={value}
        busy={busy}
        onChange={onChange}
        options={options}
      />
    );
  }

  return STUDIO_PROP_VALUE_BY_KIND[kind](props);
}

function ComposerOrderSection(props: ComposerOrderSectionProps) {
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
    rowMeta,
    onChangePropValue,
  } = props;

  const busy = savePending || embedSyncPending;
  const showPublishedAttrHint = useMemo(() => rowMeta.some((m) => (m.exposed?.length ?? 0) > 0), [rowMeta]);
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
        Drag to set order, fill content for fields your designer exposed in Engine, and save. On a collection template,
        the JSON (order + text) is written to the list CMS text field; the Engine reference list is unchanged.
      </p>

      {showPublishedAttrHint ? (
        <Alert
          data-slot="beacon_studio_codalyn_attr_hint"
          className="border-amber-500/35 bg-amber-500/8 py-2 [&>div]:text-xs"
          variant="default"
        >
          <AlertDescription className="text-balance text-muted-foreground">
            <span className="font-medium text-foreground">Published / live site:</span> Beacon only injects text (or
            URLs, etc.) into elements inside your component that have a Webflow{" "}
            <span className="font-medium text-foreground">Custom attribute</span>{" "}
            <code className="rounded bg-muted px-0.5 font-mono text-[0.65rem] text-foreground">
              data-codalyn-beacon-prop
            </code>{" "}
            with value equal to the field’s prop id (use copy on each field). If your browser console shows{" "}
            <code className="font-mono text-[0.65rem]">nodes 0</code> in applyProps, that attribute is still missing in
            the component for that slot.
          </AlertDescription>
        </Alert>
      ) : null}

      <ComposerOrderSection
        draft={draft}
        rowMeta={rowMeta}
        onChangePropValue={onChangePropValue}
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
