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
  CMS_SLOTS_COMPOSER_SLOT_EDIT_TITLE,
  CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_LABEL,
  CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_TOOLTIP,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { ComposerEditField, ComposerEditFieldSection, ComposerEditGroupLabel } from "./composer-edit-field-layout";
import { ComposerPropValueField } from "./composer-prop-value-field";

export type ComposerSlotEditViewProps = {
  row: CmsSlotCompositionDraftRow;
  exposed: ComposableInstancePropMeta[];
  busy: boolean;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  onRenameSlot: (rowKey: string, nextName: string) => void;
  /** Commit the display name and return to the composition list. */
  onDone: () => void;
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

/**
 * Dedicated full-panel editor for a single composition row (display name + exposed props). Replaces the prior
 * modal dialog: the composition list swaps to this view while a row is being edited.
 *
 * Prop values commit live; the display name is deferred and flushed on Done (or on unmount, so leaving via the
 * composer footer doesn't drop a rename) to avoid re-rendering the list on every keystroke.
 */
export function ComposerSlotEditView(props: ComposerSlotEditViewProps) {
  const { row, exposed, busy, onChangePropValue, onRenameSlot, onDone } = props;
  const [draft, setDraft] = useState(row.name);
  const fieldId = useId();

  /** Latest values read by the flush-on-unmount cleanup without re-running it on every keystroke. */
  const flushRef = useRef({ draft, row, onRenameSlot, committed: false });
  flushRef.current.draft = draft;
  flushRef.current.row = row;
  flushRef.current.onRenameSlot = onRenameSlot;

  const handleDone = useCallback(() => {
    flushComposerSlotDisplayName(draft, row, onRenameSlot);
    flushRef.current.committed = true;
    onDone();
  }, [draft, onDone, onRenameSlot, row]);

  useEffect(() => {
    return () => {
      if (flushRef.current.committed) {
        return;
      }
      const { draft: latestDraft, row: latestRow, onRenameSlot: latestRename } = flushRef.current;
      flushComposerSlotDisplayName(latestDraft, latestRow, latestRename);
    };
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden" data-slot="composer_slot_edit_view">
      {/* The surface runs flushX, so this sub-view owns its horizontal inset (px-3 on the pinned header + the
          scroll content) while the ScrollArea spans edge-to-edge — its overlay scrollbar then sits in the window
          gutter, drawer-style, and the fields stay aligned with the app header and footer. */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3">
        <h2 className="min-w-0 truncate font-heading text-base font-medium text-foreground">
          {CMS_SLOTS_COMPOSER_SLOT_EDIT_TITLE}
        </h2>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={handleDone}>
          {CMS_SLOTS_COMPOSER_SLOT_EDIT_DONE}
        </Button>
      </div>

      <ScrollArea className="min-h-0 w-full flex-1 basis-0">
        <div className="space-y-4 px-3 pb-3">
          <CmsSlotDisplayNameField
            fieldId={fieldId}
            fieldLabel={CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_LABEL}
            fieldLabelTooltip={CMS_SLOTS_COMPOSER_SLOT_NAME_FIELD_TOOLTIP}
            value={draft}
            onValueChange={setDraft}
            inputName="composer-slot-display-name"
          />
          {exposed.length > 0 ? (
            <ComposerEditFieldSection divider data-slot="cms_slot_composer_prop_fields">
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
                    {showFolderHeader ? <ComposerEditGroupLabel>{folder}</ComposerEditGroupLabel> : null}
                    <ComposerEditField label={ep.label} meta={rowMeta ?? undefined} labelHtmlFor={propFieldId}>
                      <ComposerPropValueField
                        inputId={propFieldId}
                        ep={ep}
                        value={v}
                        busy={busy}
                        onChange={(next) => onChangePropValue(row.key, ep.propId, next)}
                      />
                    </ComposerEditField>
                  </Fragment>
                );
              })}
            </ComposerEditFieldSection>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
