import { useCallback, useId, useRef, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
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
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ComposerPropValueField } from "./composer-prop-value-field";

type ComposerEditBaseline = { name: string; propValues: Record<string, string> };

export type ComposerSlotNameDrawerProps = {
  row: CmsSlotCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
  disabled?: boolean;
  /** Full Composer draft. When set with {@link onPersistComposerSlot}, drawer Save persists like header Save. */
  compositionDraft?: CmsSlotCompositionDraftRow[];
  onPersistComposerSlot?: (merged: CmsSlotCompositionDraftRow[]) => void | Promise<void>;
  /** Optional className for the row title trigger (e.g. contrast on dark Engine chrome). */
  triggerClassName?: string;
  drawerTitle?: string;
  slotNameFieldLabel?: string;
  onRename: (rowKey: string, nextName: string) => void;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
};

function savedComposerSlotName(rawDraft: string, nameFallbackRow: string): string {
  const clipped = rawDraft.slice(0, CMS_SLOT_ROW_NAME_MAX);
  const t = clipped.trim();
  return t !== "" ? t : nameFallbackRow.trim() || "Untitled";
}

function sameComposerEditsVsBaseline(params: {
  open: boolean;
  baseline: ComposerEditBaseline | null;
  draft: string;
  rowNameFallback: string;
  rowPropValues: Readonly<Record<string, string> | undefined>;
  exposedPropIds: readonly string[];
}): boolean {
  const { open, baseline, draft, rowNameFallback, rowPropValues, exposedPropIds } = params;
  if (!open || baseline == null) {
    return true;
  }
  if (savedComposerSlotName(draft, rowNameFallback) !== savedComposerSlotName(baseline.name, baseline.name)) {
    return false;
  }
  const cur = rowPropValues ?? {};
  for (const id of exposedPropIds) {
    if ((cur[id] ?? "") !== (baseline.propValues[id] ?? "")) {
      return false;
    }
  }
  return true;
}

export function ComposerSlotNameDrawer(props: ComposerSlotNameDrawerProps) {
  const {
    row,
    exposed,
    disabled,
    compositionDraft,
    onPersistComposerSlot,
    triggerClassName,
    drawerTitle = "Edit Content",
    slotNameFieldLabel = "Slot name",
    onRename,
    onChangePropValue,
  } = props;
  const [open, setOpen] = useState(false);
  const [closeBeforeSaveDialogOpen, setCloseBeforeSaveDialogOpen] = useState(false);
  const baselineRef = useRef<ComposerEditBaseline | null>(null);
  const [draft, setDraft] = useState(row.name);

  const capturedBaseline = open ? baselineRef.current : null;
  const exposedPropIds = exposed.map((ep) => ep.propId);

  const hasUnsavedComposerEdits =
    open &&
    !sameComposerEditsVsBaseline({
      open,
      baseline: capturedBaseline,
      draft,
      rowNameFallback: row.name,
      rowPropValues: row.propValues,
      exposedPropIds,
    });

  const handleComposerDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        baselineRef.current = {
          name: row.name,
          propValues: { ...(row.propValues ?? {}) },
        };
        setDraft(row.name);
        setOpen(true);
        return;
      }
      const b = baselineRef.current;
      if (
        b == null ||
        sameComposerEditsVsBaseline({
          open,
          baseline: b,
          draft,
          rowNameFallback: row.name,
          rowPropValues: row.propValues,
          exposedPropIds,
        })
      ) {
        setOpen(false);
        return;
      }
      setCloseBeforeSaveDialogOpen(true);
    },
    [draft, exposedPropIds, open, row.name, row.propValues]
  );

  const applySaveClose = useCallback(async () => {
    const clipped = draft.slice(0, CMS_SLOT_ROW_NAME_MAX);
    const t = clipped.trim();
    const resolvedName = t !== "" ? t : row.name.trim() || "Untitled";
    onRename(row.key, resolvedName);
    setCloseBeforeSaveDialogOpen(false);
    setOpen(false);
    if (compositionDraft != null && onPersistComposerSlot != null) {
      const merged = compositionDraft.map((r) => (r.key === row.key ? { ...r, name: resolvedName } : r));
      await onPersistComposerSlot(merged);
    }
  }, [compositionDraft, draft, onPersistComposerSlot, onRename, row.key, row.name]);

  const handleDiscardComposerEditsClose = useCallback(() => {
    const b = baselineRef.current;
    if (b == null) {
      return;
    }
    setDraft(b.name);
    for (const ep of exposed) {
      onChangePropValue(row.key, ep.propId, b.propValues[ep.propId] ?? "");
    }
    setCloseBeforeSaveDialogOpen(false);
    setOpen(false);
  }, [exposed, onChangePropValue, row.key]);

  const fieldId = useId();
  const len = draft.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : draft.length;

  return (
    <>
      <Drawer open={open} dismissible onOpenChange={handleComposerDrawerOpenChange}>
        <DrawerTrigger asChild>
          <Button type="button" variant="composerSlotTitle" disabled={disabled} className={triggerClassName}>
            <span className="min-w-0 truncate">{row.name}</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent stickyFooter>
          <DrawerHeader>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
            <DrawerDescription className="sr-only">Change the slot display name shown in Composer.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
                  {slotNameFieldLabel}
                </Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {len}/{CMS_SLOT_ROW_NAME_MAX}
                </span>
              </div>
              <Input
                id={fieldId}
                value={draft}
                maxLength={CMS_SLOT_ROW_NAME_MAX}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
                name="composer-slot-display-name"
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            {exposed.length > 0 ? (
              <div className="space-y-3 border-t border-border/50 pt-3" data-slot="cms_slot_composer_prop_fields">
                {exposed.map((ep) => {
                  const v = row.propValues?.[ep.propId] ?? "";
                  const propFieldId = `cms-slot-composer-${row.key}-${ep.propId}`;
                  return (
                    <div key={ep.propId} className="space-y-0.5">
                      <Label className="text-xs text-muted-foreground" htmlFor={propFieldId}>
                        {ep.label}
                      </Label>
                      <ComposerPropValueField
                        inputId={propFieldId}
                        ep={ep}
                        value={v}
                        busy={Boolean(disabled)}
                        onChange={(next) => onChangePropValue(row.key, ep.propId, next)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          <DrawerFooter>
            <Button
              type="button"
              className="w-full"
              disabled={disabled || !hasUnsavedComposerEdits}
              onClick={() => void applySaveClose()}
            >
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={closeBeforeSaveDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCloseBeforeSaveDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your edits?</AlertDialogTitle>
            <AlertDialogDescription>
              You changed this slot&apos;s content—save the slot name before closing, or discard to restore how it was
              when you opened this drawer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Continue editing</AlertDialogCancel>
            <AlertDialogCancel
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              onClick={handleDiscardComposerEditsClose}
            >
              Discard edits
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(ev) => {
                ev.preventDefault();
                void applySaveClose();
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
