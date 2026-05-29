import { Plus } from "lucide-react";
import { useState } from "react";
import { useCmsSlotsDrawerDismissBlocked } from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_COMPOSER_ADD_COMPONENT_LABEL,
  CMS_SLOTS_COMPOSER_PALETTE_SHEET_DESCRIPTION,
  CMS_SLOTS_COMPOSER_PALETTE_SHEET_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/shared/ui/drawer";
import { ComposerPaletteList, type ComposerPaletteListProps } from "./composer-palette-list";

export function ComposerPaletteSheet(props: ComposerPaletteListProps) {
  const { busy } = props;
  const [open, setOpen] = useState(false);
  const dismissBlocked = useCmsSlotsDrawerDismissBlocked(busy);

  return (
    <Drawer open={open} onOpenChange={setOpen} interactionBlocked={dismissBlocked}>
      <DrawerTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={busy}>
          <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          {CMS_SLOTS_COMPOSER_ADD_COMPONENT_LABEL}
        </Button>
      </DrawerTrigger>
      <DrawerContent stickyFooter showCloseButton>
        <DrawerHeader align="start">
          <DrawerTitle>{CMS_SLOTS_COMPOSER_PALETTE_SHEET_TITLE}</DrawerTitle>
          <DrawerDescription>{CMS_SLOTS_COMPOSER_PALETTE_SHEET_DESCRIPTION}</DrawerDescription>
        </DrawerHeader>
        <ComposerPaletteList {...props} />
      </DrawerContent>
    </Drawer>
  );
}
