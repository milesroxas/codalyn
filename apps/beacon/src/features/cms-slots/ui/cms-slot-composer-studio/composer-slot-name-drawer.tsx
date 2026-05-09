import { useEffect, useId, useState } from "react";
import { CMS_SLOT_ROW_NAME_MAX } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
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

export type ComposerSlotNameDrawerProps = {
  row: CmsSlotCompositionDraftRow;
  disabled?: boolean;
  onRename: (rowKey: string, nextName: string) => void;
};

export function ComposerSlotNameDrawer(props: ComposerSlotNameDrawerProps) {
  const { row, disabled, onRename } = props;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(row.name);

  useEffect(() => {
    if (open) {
      setDraft(row.name);
    }
  }, [open, row.name]);

  const fieldId = useId();
  const len = draft.length > CMS_SLOT_ROW_NAME_MAX ? CMS_SLOT_ROW_NAME_MAX : draft.length;

  const onSave = () => {
    const clipped = draft.slice(0, CMS_SLOT_ROW_NAME_MAX);
    const t = clipped.trim();
    onRename(row.key, t !== "" ? t : row.name.trim() || "Untitled");
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} dismissible>
      <DrawerTrigger asChild>
        <Button type="button" variant="composerSlotTitle" disabled={disabled}>
          <span className="min-w-0 truncate">{row.name}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Content</DrawerTitle>
          <DrawerDescription className="sr-only">Change the slot display name shown in Composer.</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
              Slot name
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
        <DrawerFooter>
          <Button type="button" className="w-full" disabled={disabled} onClick={() => onSave()}>
            Save
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
