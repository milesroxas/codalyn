import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import { FieldLabelHint } from "@/shared/ui/field-label-hint";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type CmsSlotDisplayNameFieldProps = {
  fieldId: string;
  fieldLabel?: string;
  fieldLabelTooltip?: string;
  value: string;
  onValueChange: (value: string) => void;
  inputName?: string;
};

export function CmsSlotDisplayNameField(props: CmsSlotDisplayNameFieldProps) {
  const {
    fieldId,
    fieldLabel = "Slot name",
    fieldLabelTooltip,
    value,
    onValueChange,
    inputName = "cms-slot-display-name",
  } = props;
  const len = value.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : value.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
            {fieldLabel}
          </Label>
          {fieldLabelTooltip ? <FieldLabelHint aboutLabel={fieldLabel}>{fieldLabelTooltip}</FieldLabelHint> : null}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {len}/{CMS_SLOT_ROW_NAME_MAX}
        </span>
      </div>
      <Input
        id={fieldId}
        value={value}
        maxLength={CMS_SLOT_ROW_NAME_MAX}
        onChange={(e) => onValueChange(e.target.value)}
        autoComplete="off"
        name={inputName}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}
