import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, Copy, GripVertical, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { copyCmsSlotInstancePropId } from "@/features/cms-slots/model/cms-slot-composer-clipboard";
import type { CmsSlotComposerRowMeta } from "@/features/cms-slots/model/cms-slot-composer-row-meta";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Label } from "@/shared/ui/label";
import { ComposerSlotNameDrawer } from "./composer-slot-name-drawer";
import { StudioPropValueField } from "./studio-prop-value-field";

export type ComposerOrderSortableRowProps = {
  row: CmsSlotCompositionDraftRow;
  meta: CmsSlotComposerRowMeta | undefined;
  busy: boolean;
  fieldsOpen: boolean;
  onFieldsOpenChange: (open: boolean) => void;
  onChangePropValue: (rowKey: string, propId: string, value: string) => void;
  onRenameSlot: (rowKey: string, name: string) => void;
  onRemove: (key: string) => void;
};

export function ComposerOrderSortableRow(props: ComposerOrderSortableRowProps) {
  const { row, meta, busy, fieldsOpen, onFieldsOpenChange, onChangePropValue, onRenameSlot, onRemove } = props;
  const exposed = meta?.exposed ?? [];
  const pvals = row.propValues ?? {};
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
    disabled: busy,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0 : undefined,
  };

  const headerRow = (
    <div className="flex min-h-9 items-center gap-1.5 px-2 py-1.5">
      <button
        type="button"
        className={cn(
          "flex size-7 shrink-0 touch-none items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-40",
          "cursor-grab"
        )}
        aria-label={`Drag to reorder ${row.name}`}
        disabled={busy}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="pointer-events-none size-4" aria-hidden />
      </button>
      {exposed.length > 0 ? (
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            aria-expanded={fieldsOpen}
            aria-label={fieldsOpen ? `Collapse fields for ${row.name}` : `Expand fields for ${row.name}`}
            disabled={busy}
          >
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", !fieldsOpen && "-rotate-90")}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>
      ) : null}
      <ComposerSlotNameDrawer row={row} disabled={busy} onRename={onRenameSlot} />
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
  );

  const fieldsBlock =
    exposed.length > 0 ? (
      <div className="space-y-1.5 border-t border-border/50 px-2 pb-2 pt-1.5" data-slot="cms_slot_studio_prop_fields">
        {exposed.map((ep) => {
          const v = pvals[ep.propId] ?? "";
          const fieldId = `cms-slot-studio-${row.key}-${ep.propId}`;
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
                  onClick={() => void copyCmsSlotInstancePropId(ep.propId)}
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>
              <p className="truncate font-mono text-[0.6rem] text-muted-foreground/90" title={ep.propId}>
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
    ) : null;

  const cardInner =
    exposed.length > 0 ? (
      <Collapsible open={fieldsOpen} onOpenChange={(o) => onFieldsOpenChange(o)}>
        {headerRow}
        <CollapsibleContent>{fieldsBlock}</CollapsibleContent>
      </Collapsible>
    ) : (
      <>
        {headerRow}
        {fieldsBlock}
      </>
    );

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-slot="cms_slot_composer_row"
      className="relative list-none rounded-sm border border-border/70 bg-card shadow-sm"
    >
      {cardInner}
    </li>
  );
}
