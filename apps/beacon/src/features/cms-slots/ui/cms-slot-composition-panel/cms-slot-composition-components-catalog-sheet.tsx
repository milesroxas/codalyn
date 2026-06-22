import { Plus } from "lucide-react";
import { useState } from "react";
import { useCmsSlotsDrawerDismissBlocked } from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_DESIGNER_ADD_COMPONENT_LABEL,
  CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_DESCRIPTION,
  CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  drawerListSheetContentDefaults,
} from "@/shared/ui/drawer";
import {
  CmsSlotCompositionComponentsCatalogList,
  type CmsSlotCompositionComponentsCatalogProps,
  CompositionComponentCatalogSearch,
} from "./cms-slot-composition-components-catalog";

export function CmsSlotCompositionComponentsCatalogSheet(props: CmsSlotCompositionComponentsCatalogProps) {
  const { addPending, searchFieldId, componentQuery, setComponentQuery, catalogLoading, onAddComponent } = props;
  const [open, setOpen] = useState(false);
  const dismissBlocked = useCmsSlotsDrawerDismissBlocked(catalogLoading, addPending);

  // Close this sheet the moment a component is picked. The props sheet auto-opens right after the add; leaving this
  // sheet open would stack two modal vaul roots, whose scroll-lock / pointer-events guards fight and leave the top
  // sheet dead (no scroll, non-interactive dropdowns). Closing here keeps the props sheet the only open drawer —
  // the same single-drawer path that already works when reopening an existing component.
  const handleAddComponent = (component: ComponentSearchResult) => {
    setOpen(false);
    onAddComponent(component);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} interactionBlocked={dismissBlocked}>
      <DrawerTrigger asChild>
        <Button type="button" variant="default" size="actionCard" disabled={addPending}>
          <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          <span>{CMS_SLOTS_DESIGNER_ADD_COMPONENT_LABEL}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent {...drawerListSheetContentDefaults}>
        <DrawerHeader align="start">
          <DrawerTitle>{CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_TITLE}</DrawerTitle>
          <DrawerDescription>{CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_DESCRIPTION}</DrawerDescription>
          <CompositionComponentCatalogSearch
            searchFieldId={searchFieldId}
            componentQuery={componentQuery}
            setComponentQuery={setComponentQuery}
            catalogLoading={catalogLoading}
          />
        </DrawerHeader>
        <CmsSlotCompositionComponentsCatalogList {...props} onAddComponent={handleAddComponent} />
      </DrawerContent>
    </Drawer>
  );
}
