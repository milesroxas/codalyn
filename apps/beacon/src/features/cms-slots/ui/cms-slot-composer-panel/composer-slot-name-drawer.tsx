import { useCallback, useId, useRef, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE } from "@/shared/lib/cms-slots-feature-copy";
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

export type ComposerSlotNameDrawerRenameCommit = "draft" | "persist";

export type ComposerSlotNameDrawerProps = {
  row: CmsSlotCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
  disabled?: boolean;
  /**
   * `draft` (Composer): flush display name into the local composition on Done or dismiss.
   * `persist` (Engine published rename): call {@link onRename} only on Done; dismiss reverts the field.
   */
  renameCommit?: ComposerSlotNameDrawerRenameCommit;
  /** Optional className for the row title trigger (e.g. contrast on dark Engine chrome). */
  triggerClassName?: string;
  drawerTitle?: string;
  slotNameFieldLabel?: string;
  onRename: (rowKey: string, nextName: string) => void;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
};

function savedComposerSlotDisplayName(rawDraft: string, nameFallbackRow: string): string {
  const clipped = rawDraft.slice(0, CMS_SLOT_ROW_NAME_MAX);
  const t = clipped.trim();
  return t !== "" ? t : nameFallbackRow.trim() || "Untitled";
}

function flushComposerSlotDisplayName(
  rawDraft: string,
  row: CmsSlotCompositionDraftRow,
  onRename: (rowKey: string, nextName: string) => void
): void {
  const resolved = savedComposerSlotDisplayName(rawDraft, row.name);
  if (resolved !== row.name) {
    onRename(row.key, resolved);
  }
}

export function ComposerSlotNameDrawer(props: ComposerSlotNameDrawerProps) {
  const {
    row,
    exposed,
    disabled,
    renameCommit = "draft",
    triggerClassName,
    drawerTitle = "Edit Content",
    slotNameFieldLabel = "Slot name",
    onRename,
    onChangePropValue,
  } = props;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(row.name);
  const doneCommittedRef = useRef(false);

  const handleDone = useCallback(() => {
    if (renameCommit === "persist") {
      flushComposerSlotDisplayName(draft, row, onRename);
      doneCommittedRef.current = true;
      setOpen(false);
      return;
    }
    flushComposerSlotDisplayName(draft, row, onRename);
    setOpen(false);
  }, [draft, onRename, renameCommit, row]);

  const handleComposerDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        doneCommittedRef.current = false;
        setDraft(row.name);
        setOpen(true);
        return;
      }
      if (renameCommit === "draft") {
        flushComposerSlotDisplayName(draft, row, onRename);
        setOpen(false);
        return;
      }
      if (!doneCommittedRef.current) {
        setDraft(row.name);
      }
      doneCommittedRef.current = false;
      setOpen(false);
    },
    [draft, onRename, renameCommit, row]
  );

  const fieldId = useId();
  const len = draft.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : draft.length;

  return (
    <Drawer open={open} onOpenChange={handleComposerDrawerOpenChange}>
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
          <Button type="button" className="w-full" disabled={disabled} onClick={handleDone}>
            {CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
