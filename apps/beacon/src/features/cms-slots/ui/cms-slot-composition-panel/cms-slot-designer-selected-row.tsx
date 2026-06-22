import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconArrowBackUp, IconCheck, IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ComposableInstancePropMeta,
  hasUnconstrainedExposedImageProps,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  type CmsSlotVariantControl,
  isBaseVariantId,
  readVariantControlFromInstanceProps,
} from "@/features/cms-slots/model/cms-slot-instance-variant";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { ComposerRemoveDraftDialog } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-remove-draft-dialog";
import { ComposerUnsavedChangesDialog } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-unsaved-changes-dialog";
import { CmsSlotDesignerExposePropsPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel/cms-slot-designer-expose-props-panel";
import {
  useCmsSlotsDrawerDismissBlocked,
  useCmsSlotsRouteInteractionBlocked,
} from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_DISCARD_DIALOG_TITLE,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DESCRIPTION,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_TITLE,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_PENDING_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/shared/ui/button-group";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  drawerListSheetContentDefaults,
} from "@/shared/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

function sameExposedProps(a: ComposableInstancePropMeta[], b: ComposableInstancePropMeta[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map((x) => [x.propId, x]));
  for (const entry of a) {
    const other = byId.get(entry.propId);
    if (other == null) {
      return false;
    }
    // Compare configured values too (e.g. image export constraints) so editing them counts as a pending change
    // that must be applied — not silently written through.
    if (JSON.stringify(entry.imageExport ?? null) !== JSON.stringify(other.imageExport ?? null)) {
      return false;
    }
  }
  return true;
}

function snapshotExposed(exposed: ComposableInstancePropMeta[]): ComposableInstancePropMeta[] {
  return exposed.map((x) => ({ ...x }));
}

/** Top-level component row: standard spacing, slightly larger than its nested variant rows. */
const selectedRowClass = "flex items-center gap-2 px-3 py-2 text-sm";
/**
 * Variant row nested under its component: tight spacing and smaller text. `rounded-md` keeps the hover background inset
 * from the list edges (the wrapping list adds the surrounding inset); indentation comes from the list's tree rail.
 */
const nestedVariantRowClass = "flex items-center gap-2 rounded-sm py-1 pr-2 pl-2 text-xs";
/** Shared interactive affordance for a clickable row (top-level or nested): full-width hit area + hover/focus state. */
const selectedRowButtonClass =
  "w-full text-left outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 disabled:pointer-events-none disabled:opacity-60";

type SelectedRowBarProps = {
  nested: boolean;
  /** What the row shows as its name: the component name for the top-level row, the variant name for a nested row. */
  displayName: string;
  /** Top-level row only: the pinned variant's name, shown as a badge beside the slot count (null on the base variant). */
  variantBadge?: string | null;
  exposedCount: number;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  onOpen: () => void;
};

type SelectedRowDrawerFooterProps = {
  /** Whether this seed is the variant-capable parent (shows the "Save & add variant" action). */
  showAddVariant: boolean;
  applyLabel: string;
  applyDisabled: boolean;
  removeDisabled: boolean;
  removeBusy: boolean;
  addVariantDisabled: boolean;
  tagAttrsBusy: boolean;
  onRemove: () => void;
  onApply: () => void;
  onSaveAndAddVariant: () => void;
};

type FooterDisabledInputs = {
  removing: boolean;
  listTargetActionBusy: boolean;
  tagAttrsBusy: boolean;
  composableLoading: boolean;
  addPending: boolean;
  hasUnconstrainedImageProps: boolean;
  hasPendingChange: boolean;
};

/**
 * Resolves the row's visible name and optional variant badge. The top-level row always shows the component name (with a
 * pinned non-base variant surfaced as a badge); a nested row shows the variant name itself.
 */
function resolveSelectedRowLabels(
  nested: boolean,
  variantLabel: string,
  publishedDisplayName: string,
  rowVariant: { variantName: string } | null
): { displayName: string; variantBadge: string | null } {
  if (nested) {
    return { displayName: variantLabel, variantBadge: null };
  }
  return { displayName: publishedDisplayName, variantBadge: rowVariant?.variantName ?? null };
}

/** Derives the footer action disabled states from the row's busy/validity flags (kept out of the component body). */
function computeFooterDisabledStates(i: FooterDisabledInputs) {
  const baseBusy = i.removing || i.listTargetActionBusy || i.tagAttrsBusy;
  return {
    applyDisabled: baseBusy || i.composableLoading || i.hasUnconstrainedImageProps || !i.hasPendingChange,
    removeDisabled: baseBusy,
    addVariantDisabled: baseBusy || i.addPending || i.hasUnconstrainedImageProps,
  };
}

/**
 * Buttons for a selected component/variant sheet footer: destructive Remove + the expose/apply action (+ Save & add
 * variant). Rendered inside a `DrawerFooter` by the caller — the sticky-footer layout matches `DrawerFooter` by element
 * type, so this must not introduce its own wrapper element.
 */
function SelectedRowDrawerFooterButtons(props: SelectedRowDrawerFooterProps) {
  const {
    showAddVariant,
    applyLabel,
    applyDisabled,
    removeDisabled,
    removeBusy,
    addVariantDisabled,
    tagAttrsBusy,
    onRemove,
    onApply,
    onSaveAndAddVariant,
  } = props;

  const applyButton = (
    <Button
      type="button"
      variant="secondary"
      size="drawerAction"
      className="flex-1"
      disabled={applyDisabled}
      aria-busy={tagAttrsBusy}
      onClick={onApply}
    >
      {applyLabel}
    </Button>
  );

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="size-9 shrink-0"
        aria-label="Remove"
        disabled={removeDisabled}
        aria-busy={removeBusy}
        onClick={onRemove}
      >
        <IconTrash aria-hidden />
      </Button>
      {showAddVariant ? (
        <ButtonGroup className="flex-1">
          {applyButton}
          <ButtonGroupSeparator />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-9 shrink-0"
                aria-label="More actions"
                disabled={addVariantDisabled}
              >
                <IconDots aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem
                className="flex-col items-start gap-0.5"
                disabled={addVariantDisabled}
                onSelect={onSaveAndAddVariant}
              >
                <span className="font-medium">Add Variant</span>
                <span className="text-xs text-muted-foreground">
                  Make this component editable and create a variant of this component
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      ) : (
        applyButton
      )}
    </>
  );
}

/** The inline row in the selected-components list — compact variant form when `nested`, full component form otherwise. */
function SelectedRowBar(props: SelectedRowBarProps) {
  const { nested, displayName, variantBadge, exposedCount, removingKey, listTargetActionBusy, onOpen } = props;

  return (
    <button
      type="button"
      className={cn(nested ? nestedVariantRowClass : selectedRowClass, selectedRowButtonClass)}
      aria-label={nested ? `Edit ${displayName}` : undefined}
      disabled={removingKey !== null || listTargetActionBusy}
      onClick={onOpen}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          // Nested variant names read as children of the component: lighter weight + muted, against the top-level
          // component name's bolder foreground. The size step (text-xs vs text-sm) comes from the row class.
          nested ? "font-normal text-muted-foreground" : "font-medium"
        )}
      >
        {displayName}
      </span>
      {/* The variant badge + slot count are only shown on the top-level component row; variant rows stay compact. */}
      {nested ? null : (
        <>
          {variantBadge != null ? (
            <Badge variant="secondary" size="sm" className="max-w-28 shrink-0 truncate">
              {variantBadge}
            </Badge>
          ) : null}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{exposedCount} Slots</span>
        </>
      )}
    </button>
  );
}

type SelectedRowDrawerHeaderProps = {
  /** Variant sheets are not renamable; only the published parent slot can be renamed. */
  nested: boolean;
  title: string;
  description: string;
  open: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  renameBusy: boolean;
  onRename: (next: string) => void;
};

/**
 * Props-sheet header. For a published parent row a pencil swaps the title for an inline rename field with check/cancel
 * controls (Enter saves, Escape cancels); the edit reverts whenever the sheet closes.
 */
function SelectedRowDrawerHeader(props: SelectedRowDrawerHeaderProps) {
  const { nested, title, description, open, removingKey, listTargetActionBusy, renameBusy, onRename } = props;
  const renameDisabled = renameBusy || removingKey !== null || listTargetActionBusy;
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close the sheet → drop any in-progress rename so reopening starts from the persisted title.
  useEffect(() => {
    if (!open) {
      setRenaming(false);
    }
  }, [open]);

  useEffect(() => {
    if (!renaming) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [renaming]);

  const startRename = useCallback(() => {
    setDraft(title);
    setRenaming(true);
  }, [title]);

  const commitRename = useCallback(() => {
    const clipped = draft.slice(0, CMS_SLOT_ROW_NAME_MAX).trim();
    const next = clipped !== "" ? clipped : title;
    if (next !== title) {
      onRename(next);
    }
    setRenaming(false);
  }, [draft, onRename, title]);

  return (
    <DrawerHeader align="start">
      {!nested && renaming ? (
        // -my-0.5 keeps the header height compact despite the taller field; overflow-visible + the row padding give the
        // input's focus ring room so it is never clipped by the header edge.
        <div className="-my-0.5 flex items-center gap-1 overflow-visible px-0.5 py-0.5" data-vaul-no-drag="">
          <Input
            ref={inputRef}
            value={draft}
            maxLength={CMS_SLOT_ROW_NAME_MAX}
            aria-label="Slot name"
            className="h-7 min-w-0 flex-1"
            disabled={renameBusy}
            autoComplete="off"
            onChange={(e) => setDraft(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setRenaming(false);
              }
            }}
          />
          <ButtonGroup className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Save name"
              aria-busy={renameBusy}
              disabled={renameBusy}
              onClick={commitRename}
            >
              <IconCheck aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label="Cancel rename"
              disabled={renameBusy}
              onClick={() => setRenaming(false)}
            >
              <IconArrowBackUp aria-hidden />
            </Button>
          </ButtonGroup>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <DrawerTitle className="min-w-0 truncate">{title}</DrawerTitle>
          {!nested ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              aria-label="Rename slot"
              disabled={renameDisabled}
              onClick={startRename}
            >
              <IconPencil aria-hidden className="size-3.5" />
            </Button>
          ) : null}
        </div>
      )}
      <DrawerDescription>{description}</DrawerDescription>
    </DrawerHeader>
  );
}

/**
 * Local staging for the seed's variant picker. The dropdown only updates a draft id — the real write (and any
 * on-canvas placement it triggers) is deferred until a commit button calls {@link applyStagedVariantIfChanged}. This is
 * why picking a variant while adding a component no longer kicks off a place-on-canvas pass on its own. `draftVariantId`
 * falls back to the persisted selection; it re-syncs whenever the control reloads so a backed-out pick never lingers.
 */
function useStagedVariantPicker(
  variantControl: CmsSlotVariantControl | null,
  row: HydratedCmsSlotRow,
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>
) {
  const [draftVariantId, setDraftVariantId] = useState<string | null>(null);
  useEffect(() => {
    setDraftVariantId(variantControl?.selectedId ?? null);
  }, [variantControl]);

  const resetVariantDraft = useCallback(() => {
    setDraftVariantId(variantControl?.selectedId ?? null);
  }, [variantControl]);

  const hasVariantDraftChange =
    variantControl != null && draftVariantId != null && draftVariantId !== variantControl.selectedId;

  const applyStagedVariantIfChanged = useCallback(async () => {
    if (variantControl == null || draftVariantId == null || draftVariantId === variantControl.selectedId) {
      return;
    }
    await onSetSeedVariant(row, variantControl.propId, draftVariantId);
  }, [variantControl, draftVariantId, onSetSeedVariant, row]);

  return { draftVariantId, setDraftVariantId, hasVariantDraftChange, resetVariantDraft, applyStagedVariantIfChanged };
}

type SelectedRowVariantPickerProps = {
  variantControl: CmsSlotVariantControl;
  draftVariantId: string | null;
  onDraftChange: (variantId: string) => void;
  rowKey: string;
  publishedDisplayName: string;
  disabled: boolean;
  /** Disables the base option — a variant seed must resolve to a real variant, never the parent's base. */
  disableBase?: boolean;
};

/**
 * The seed's variant dropdown, rendered as the expose-panel's leading item. It only stages a draft selection — the
 * pinned variant is written when a commit button runs ({@link useStagedVariantPicker}).
 */
function SelectedRowVariantPicker(props: SelectedRowVariantPickerProps) {
  const { variantControl, draftVariantId, onDraftChange, rowKey, publishedDisplayName, disabled, disableBase } = props;
  return (
    <SurfaceSummaryCardSelectRow density="compact" htmlFor={`${rowKey}-variant`} data-vaul-no-drag="">
      <SurfaceSummaryCardIconRowCopy>
        <SurfaceSummaryCardTitle density="compact">Variant</SurfaceSummaryCardTitle>
      </SurfaceSummaryCardIconRowCopy>
      <SurfaceSummaryCardSelectRowControl>
        <Select value={draftVariantId ?? variantControl.selectedId} disabled={disabled} onValueChange={onDraftChange}>
          <SelectTrigger id={`${rowKey}-variant`} size="sm" aria-label={`Variant for ${publishedDisplayName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variantControl.options.map((o) => (
              <SelectItem key={o.id} value={o.id} disabled={disableBase === true && isBaseVariantId(o.id)}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SurfaceSummaryCardSelectRowControl>
    </SurfaceSummaryCardSelectRow>
  );
}

type CmsSlotDesignerSelectedRowProps = {
  row: HydratedCmsSlotRow;
  slotIndex: number;
  /** Resolved from the same runtime JSON `n[]` Composer uses (see {@link publishedDisplayNamesForDesignerPool}). */
  publishedDisplayName: string;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  composableLoading: boolean;
  composableMetaReady: boolean;
  addPending: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingDesignerSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>;
  settingVariantKey: string | null;
  onAddVariant: (row: HydratedCmsSlotRow) => void | Promise<void>;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncDesignerSlotAttrs: (slotIndex: number, compositionChanged?: boolean) => boolean | Promise<boolean>;
  /** When set to this row’s `key`, opens the expose/tag drawer once (e.g. right after adding the component). */
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
  /** True when this seed is staged but not yet committed to the slot list (closing its sheet discards it). */
  pending?: boolean;
  /** Discards a staged seed — removes its instance and drops it from the selection. */
  onDiscardPendingSeed?: (row: HydratedCmsSlotRow) => void;
  /** Renders the row as a variant nested under its component: compact, indented, variant-name-only, no Add-variant. */
  nested?: boolean;
};

export function CmsSlotDesignerSelectedRow(props: CmsSlotDesignerSelectedRowProps) {
  const {
    row,
    slotIndex,
    publishedDisplayName,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    available,
    slotExposed,
    composableLoading,
    composableMetaReady,
    addPending,
    removingKey,
    listTargetActionBusy,
    resyncingDesignerSlotKey,
    onRemove,
    onSetSeedVariant,
    settingVariantKey,
    onAddVariant,
    onSetSlotExposed,
    onResyncDesignerSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
    pending = false,
    onDiscardPendingSeed,
    nested = false,
  } = props;
  const showComposableLoading = useDeferredLoadingIndicator(composableLoading);
  const routeInteractionBlocked = useCmsSlotsRouteInteractionBlocked();

  const [variantControl, setVariantControl] = useState<CmsSlotVariantControl | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const instanceProps = await row.instance.searchProps();
        if (!cancelled) {
          setVariantControl(readVariantControlFromInstanceProps(instanceProps));
        }
      } catch {
        if (!cancelled) {
          setVariantControl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.instance]);

  const { draftVariantId, setDraftVariantId, hasVariantDraftChange, resetVariantDraft, applyStagedVariantIfChanged } =
    useStagedVariantPicker(variantControl, row, onSetSeedVariant);

  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [closeBeforeTagDialogOpen, setCloseBeforeTagDialogOpen] = useState(false);
  // Confirmation shown when the user dismisses a staged seed's sheet without committing it.
  const [pendingLeaveDialogOpen, setPendingLeaveDialogOpen] = useState(false);
  const [tagAttrsPending, setTagAttrsPending] = useState(false);
  // Captured when the drawer opens: a slot that already has exposed props is being updated, not set up.
  const [editingExistingSelection, setEditingExistingSelection] = useState(false);
  const tagAttrsPendingRef = useRef(false);
  const exposeBaselineRef = useRef<ComposableInstancePropMeta[]>([]);
  const exposedCount = slotExposed.length;

  const tagAttrsBusy = tagAttrsPending || resyncingDesignerSlotKey === row.key;
  const exposeDrawerDismissBlocked = useCmsSlotsDrawerDismissBlocked(tagAttrsBusy);

  const hasNewExposeSelections = propsDrawerOpen && !sameExposedProps(slotExposed, exposeBaselineRef.current);
  const footerDisabled = computeFooterDisabledStates({
    removing: removingKey !== null,
    listTargetActionBusy,
    tagAttrsBusy,
    composableLoading,
    addPending,
    // Block applying / spawning a variant while any exposed image prop is still missing export constraints.
    hasUnconstrainedImageProps: hasUnconstrainedExposedImageProps(slotExposed),
    // The apply action is the commit point. A staged seed (just added — e.g. via "Add Variant") always needs it enabled
    // so it can be saved into the slot; an already-committed seed only enables it once its exposed props or variant
    // actually changed.
    hasPendingChange: pending || hasNewExposeSelections || hasVariantDraftChange,
  });

  const openExposeDrawer = useCallback(() => {
    exposeBaselineRef.current = snapshotExposed(slotExposed);
    setEditingExistingSelection(slotExposed.length > 0);
    resetVariantDraft();
    setPropsDrawerOpen(true);
  }, [slotExposed, resetVariantDraft]);

  const applyActionLabel = editingExistingSelection
    ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_LABEL
    : CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_LABEL;
  const discardDialogTitle = editingExistingSelection
    ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_DISCARD_DIALOG_TITLE
    : CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_TITLE;

  useEffect(() => {
    if (autoOpenExposeDrawerRowKey !== row.key) {
      return;
    }
    if (addPending || listTargetActionBusy || composableLoading || !composableMetaReady || routeInteractionBlocked) {
      return;
    }
    // The palette sheet that triggered the add closes itself as the row is added, so its vaul exit
    // animation (~500ms) is still running. Opening this drawer on top of a closing modal drawer leaves
    // two overlapping scroll-locks fighting, and the fresh sheet ends up non-interactive (no scroll,
    // dead dropdowns) until it is reopened. Wait for any closing drawer to leave the DOM first.
    let cancelled = false;
    const deadline = performance.now() + 1200;
    let frame = requestAnimationFrame(function openWhenClear() {
      if (cancelled) {
        return;
      }
      const closingDrawer = document.querySelector('[data-vaul-drawer][data-state="closed"]');
      if (closingDrawer != null && performance.now() < deadline) {
        frame = requestAnimationFrame(openWhenClear);
        return;
      }
      openExposeDrawer();
      onAutoOpenExposeDrawerConsumed?.();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [
    addPending,
    autoOpenExposeDrawerRowKey,
    composableLoading,
    composableMetaReady,
    listTargetActionBusy,
    onAutoOpenExposeDrawerConsumed,
    openExposeDrawer,
    routeInteractionBlocked,
    row.key,
  ]);

  const handlePropsDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setPropsDrawerOpen(true);
        return;
      }
      if (exposeDrawerDismissBlocked) {
        return;
      }
      if (tagAttrsPendingRef.current || resyncingDesignerSlotKey === row.key) {
        return;
      }
      if (pending) {
        // A staged seed is committed only by a footer commit button (“Make editable” / “Add Variant”). Closing the
        // sheet any other way (X, backdrop, Escape) would discard the just-added seed, so prompt first — mirroring the
        // Composer's leave-with-unsaved-changes dialog — rather than dropping the work silently.
        setPendingLeaveDialogOpen(true);
        return;
      }
      if (sameExposedProps(slotExposed, exposeBaselineRef.current)) {
        setPropsDrawerOpen(false);
        return;
      }
      setCloseBeforeTagDialogOpen(true);
    },
    [exposeDrawerDismissBlocked, resyncingDesignerSlotKey, row.key, slotExposed, pending]
  );

  // Discards the staged seed (the "Discard" choice in the leave dialog): drop it from the slot as if never added.
  const handleDiscardPendingFromLeaveDialog = useCallback(() => {
    setPendingLeaveDialogOpen(false);
    setPropsDrawerOpen(false);
    onDiscardPendingSeed?.(row);
  }, [onDiscardPendingSeed, row]);

  const handleDiscardExposeChangesClose = useCallback(() => {
    onSetSlotExposed(slotIndex, snapshotExposed(exposeBaselineRef.current));
    setCloseBeforeTagDialogOpen(false);
    setPropsDrawerOpen(false);
  }, [onSetSlotExposed, slotIndex]);

  const applyTagAttrsAndCloseDrawer = useCallback(async () => {
    if (tagAttrsPendingRef.current || hasUnconstrainedExposedImageProps(slotExposed)) {
      return;
    }
    const variantChanged = hasVariantDraftChange;
    tagAttrsPendingRef.current = true;
    setTagAttrsPending(true);
    try {
      await applyStagedVariantIfChanged();
      // A staged seed must always re-tag (that re-tag is its commit point); an already-committed seed only re-tags when
      // its exposed props changed. A variant-only change on a committed seed skips the re-tag and relies on the variant
      // write's own "needs Sync" mark. When both changed, the flag keeps that mark set through the re-tag.
      if (pending || hasNewExposeSelections) {
        const ok = await onResyncDesignerSlotAttrs(slotIndex, variantChanged);
        if (ok !== true) {
          return;
        }
        exposeBaselineRef.current = snapshotExposed(slotExposed);
      }
      setCloseBeforeTagDialogOpen(false);
      setPropsDrawerOpen(false);
    } finally {
      tagAttrsPendingRef.current = false;
      setTagAttrsPending(false);
    }
  }, [
    applyStagedVariantIfChanged,
    hasNewExposeSelections,
    hasVariantDraftChange,
    onResyncDesignerSlotAttrs,
    pending,
    slotIndex,
    slotExposed,
  ]);

  const handleRemoveFromDrawer = useCallback(() => {
    setRemoveConfirmOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    setRemoveConfirmOpen(false);
    setPropsDrawerOpen(false);
    void onRemove(row);
  }, [onRemove, row]);

  // Persists any pending expose changes for this parent seed, then spawns a variant that copies its configured props.
  const saveAndAddVariant = useCallback(async () => {
    if (tagAttrsPendingRef.current || hasUnconstrainedExposedImageProps(slotExposed)) {
      return;
    }
    const variantChanged = hasVariantDraftChange;
    tagAttrsPendingRef.current = true;
    setTagAttrsPending(true);
    try {
      await applyStagedVariantIfChanged();
      // Only re-tag attributes when the exposed props changed; the new variant seed commits itself via onAddVariant.
      if (hasNewExposeSelections) {
        const ok = await onResyncDesignerSlotAttrs(slotIndex, variantChanged);
        if (ok !== true) {
          return;
        }
        exposeBaselineRef.current = snapshotExposed(slotExposed);
      }
    } finally {
      tagAttrsPendingRef.current = false;
      setTagAttrsPending(false);
    }
    setPropsDrawerOpen(false);
    void onAddVariant(row);
  }, [
    applyStagedVariantIfChanged,
    hasNewExposeSelections,
    hasVariantDraftChange,
    onAddVariant,
    onResyncDesignerSlotAttrs,
    row,
    slotExposed,
    slotIndex,
  ]);

  const publishedRenameBusy = renamingPublishedSlotKey === row.key;

  const variantLabel = row.variant != null ? row.variant.variantName : publishedDisplayName;
  // Top-level row keeps its component name even when pinned to a variant; the variant shows as a badge instead.
  const { displayName: rowDisplayName, variantBadge } = resolveSelectedRowLabels(
    nested,
    variantLabel,
    publishedDisplayName,
    row.variant
  );

  return (
    <>
      <SelectedRowBar
        nested={nested}
        displayName={rowDisplayName}
        variantBadge={variantBadge}
        exposedCount={exposedCount}
        removingKey={removingKey}
        listTargetActionBusy={listTargetActionBusy}
        onOpen={openExposeDrawer}
      />

      <Drawer
        open={propsDrawerOpen}
        interactionBlocked={exposeDrawerDismissBlocked}
        onOpenChange={handlePropsDrawerOpenChange}
      >
        <DrawerContent {...drawerListSheetContentDefaults}>
          <SelectedRowDrawerHeader
            nested={nested}
            title={nested ? variantLabel : publishedDisplayName}
            description={CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DESCRIPTION}
            open={propsDrawerOpen}
            removingKey={removingKey}
            listTargetActionBusy={listTargetActionBusy}
            renameBusy={publishedRenameBusy}
            onRename={(next) => onRenamePublishedDisplayName(row.key, next)}
          />
          <CmsSlotDesignerExposePropsPanel
            rowKey={row.key}
            slotIndex={slotIndex}
            available={available}
            slotExposed={slotExposed}
            showComposableLoading={showComposableLoading}
            disabled={removingKey !== null || tagAttrsBusy}
            onSetSlotExposed={onSetSlotExposed}
            leadingItem={
              // Shown for variant seeds too (nested): the seed's whole identity is its variant, so its sheet must let
              // you pick one — that pick is what enables the save/commit action when adding a variant.
              variantControl != null ? (
                <SelectedRowVariantPicker
                  variantControl={variantControl}
                  draftVariantId={draftVariantId}
                  onDraftChange={setDraftVariantId}
                  rowKey={row.key}
                  publishedDisplayName={nested ? variantLabel : publishedDisplayName}
                  disableBase={nested}
                  disabled={
                    settingVariantKey === row.key || removingKey !== null || listTargetActionBusy || tagAttrsBusy
                  }
                />
              ) : null
            }
          />
          <DrawerFooter layout="sticky" className="flex-row items-center">
            <SelectedRowDrawerFooterButtons
              showAddVariant={!nested && variantControl != null}
              applyLabel={tagAttrsBusy ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_PENDING_LABEL : applyActionLabel}
              applyDisabled={footerDisabled.applyDisabled}
              removeDisabled={footerDisabled.removeDisabled}
              removeBusy={removingKey === row.key}
              addVariantDisabled={footerDisabled.addVariantDisabled}
              tagAttrsBusy={tagAttrsBusy}
              onRemove={handleRemoveFromDrawer}
              onApply={() => void applyTagAttrsAndCloseDrawer()}
              onSaveAndAddVariant={() => void saveAndAddVariant()}
            />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={closeBeforeTagDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCloseBeforeTagDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{discardDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={tagAttrsBusy}>
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL}
            </AlertDialogCancel>
            <AlertDialogCancel
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              disabled={tagAttrsBusy}
              onClick={handleDiscardExposeChangesClose}
            >
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={tagAttrsBusy}
              onClick={(ev) => {
                ev.preventDefault();
                void applyTagAttrsAndCloseDrawer();
              }}
            >
              {applyActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComposerRemoveDraftDialog
        open={removeConfirmOpen}
        componentName={variantLabel}
        busy={removingKey === row.key}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveConfirmOpen(false);
          }
        }}
        onConfirm={handleConfirmRemove}
      />

      <ComposerUnsavedChangesDialog
        open={pendingLeaveDialogOpen}
        busy={tagAttrsBusy}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLeaveDialogOpen(false);
          }
        }}
        onDiscard={handleDiscardPendingFromLeaveDialog}
        onSave={async () => {
          setPendingLeaveDialogOpen(false);
          await applyTagAttrsAndCloseDrawer();
        }}
      />
    </>
  );
}
