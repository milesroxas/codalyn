import { Plus } from "lucide-react";
import { useState } from "react";
import {
  CMS_SLOTS_ENGINE_ADD_COMPONENT_LABEL,
  CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_DESCRIPTION,
  CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/shared/ui/drawer";
import {
  CmsSlotCompositionComponentsCatalogList,
  type CmsSlotCompositionComponentsCatalogProps,
  CompositionComponentCatalogSearch,
} from "./cms-slot-composition-components-catalog";

export function CmsSlotCompositionComponentsCatalogSheet(props: CmsSlotCompositionComponentsCatalogProps) {
  const { addPending, searchFieldId, componentQuery, setComponentQuery, catalogLoading } = props;
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} dismissible>
      <DrawerTrigger asChild>
        <Button type="button" variant="actionCard" size="actionCard" disabled={addPending}>
          <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          <span>{CMS_SLOTS_ENGINE_ADD_COMPONENT_LABEL}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent stickyFooter showCloseButton>
        <DrawerHeader align="start">
          <DrawerTitle>{CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_TITLE}</DrawerTitle>
          <DrawerDescription>{CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_DESCRIPTION}</DrawerDescription>
          <CompositionComponentCatalogSearch
            searchFieldId={searchFieldId}
            componentQuery={componentQuery}
            setComponentQuery={setComponentQuery}
            catalogLoading={catalogLoading}
          />
        </DrawerHeader>
        <CmsSlotCompositionComponentsCatalogList {...props} />
      </DrawerContent>
    </Drawer>
  );
}
