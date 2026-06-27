import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type ComposableInstancePropMeta,
  cmsSlotPropFolder,
  cmsSlotPropSubgroupLabel,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { CmsSlotDisplayNameField } from "@/features/cms-slots/ui/cms-slot-display-name-field";
import {
  CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE,
  CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_LABEL,
  CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_TOOLTIP,
} from "@/shared/lib/cms-slots-feature-copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogFormField,
  AlertDialogFormGroupLabel,
  AlertDialogHeader,
  AlertDialogScrollBody,
  AlertDialogScrollSection,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogScrollContentDefaults,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { ComposerPropValueField } from "./composer-prop-value-field";

export type ComposerSlotNameDialogRenameCommit = "draft" | "persist";

export type ComposerSlotNameDialogProps = {
  row: CmsSlotCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
  disabled?: boolean;
  /**
   * `draft` (Composer): flush display name into the local composition on Done or dismiss.
   * `persist` (Designer published rename): call {@link onRename} only on Done; dismiss reverts the field.
   */
  renameCommit?: ComposerSlotNameDialogRenameCommit;
  dialogTitle?: string;
  slotNameFieldLabel?: string;
  slotNameFieldTooltip?: string;
  /** Text shown on the trigger row (defaults to `row.name`); the pinned variant is surfaced as a badge by the caller. */
  triggerLabel?: string;
  onRename: (rowKey: string, nextName: string) => void;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  /** When true once (e.g. right after adding the row), opens this edit dialog. */
  requestAutoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
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

export function ComposerSlotNameDialog(props: ComposerSlotNameDialogProps) {
  const {
    row,
    exposed,
    disabled,
    renameCommit = "draft",
    dialogTitle = "Edit Content",
    slotNameFieldLabel = CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_LABEL,
    slotNameFieldTooltip = CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_TOOLTIP,
    triggerLabel,
    onRename,
    onChangePropValue,
    requestAutoOpen = false,
    onAutoOpenConsumed,
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

  useEffect(() => {
    if (!requestAutoOpen || disabled) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      doneCommittedRef.current = false;
      setDraft(row.name);
      setOpen(true);
      onAutoOpenConsumed?.();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [disabled, onAutoOpenConsumed, requestAutoOpen, row.name]);

  const handleDialogOpenChange = useCallback(
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

  return (
    <AlertDialog open={open} onOpenChange={handleDialogOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="composerSlotTitle" disabled={disabled}>
          <span className="min-w-0 truncate">{triggerLabel ?? row.name}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent {...alertDialogScrollContentDefaults}>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Change the slot display name shown in Composer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogScrollBody spacing="form">
          <CmsSlotDisplayNameField
            fieldId={fieldId}
            fieldLabel={slotNameFieldLabel}
            fieldLabelTooltip={slotNameFieldTooltip}
            value={draft}
            onValueChange={setDraft}
            inputName="composer-slot-display-name"
          />
          {exposed.length > 0 ? (
            <AlertDialogScrollSection divider data-slot="cms_slot_composer_prop_fields">
              {exposed.map((ep, i) => {
                const v = row.propValues?.[ep.propId] ?? "";
                const propFieldId = `cms-slot-composer-${row.key}-${ep.propId}`;
                // Props arrive folder-clustered (see orderComposablePropsForComposer); render one compact header per
                // folder. The row meta then shows only the sub-group, so the folder name isn't repeated on every field.
                const folder = cmsSlotPropFolder(ep.group);
                const prevFolder = i > 0 ? cmsSlotPropFolder(exposed[i - 1]?.group) : null;
                const showFolderHeader = folder != null && folder !== prevFolder;
                const rowMeta = folder != null ? cmsSlotPropSubgroupLabel(ep.group) : ep.group;
                return (
                  <Fragment key={ep.propId}>
                    {showFolderHeader ? <AlertDialogFormGroupLabel>{folder}</AlertDialogFormGroupLabel> : null}
                    <AlertDialogFormField label={ep.label} meta={rowMeta ?? undefined} labelHtmlFor={propFieldId}>
                      <ComposerPropValueField
                        inputId={propFieldId}
                        ep={ep}
                        value={v}
                        busy={Boolean(disabled)}
                        onChange={(next) => onChangePropValue(row.key, ep.propId, next)}
                      />
                    </AlertDialogFormField>
                  </Fragment>
                );
              })}
            </AlertDialogScrollSection>
          ) : null}
        </AlertDialogScrollBody>
        <AlertDialogFooter layout="sticky">
          <AlertDialogAction
            type="button"
            variant="secondary"
            size="drawerAction"
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              handleDone();
            }}
          >
            {CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
