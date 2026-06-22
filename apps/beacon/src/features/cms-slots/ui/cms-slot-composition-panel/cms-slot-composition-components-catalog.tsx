import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import {
  CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LIST_ARIA_LABEL,
  CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LOADING_ARIA_LABEL,
  CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER,
} from "@/shared/lib/cms-slots-feature-copy";
import { DrawerScrollList, DrawerScrollListAddActionRow } from "@/shared/ui/drawer-scroll-list";
import { InputSearch } from "@/shared/ui/input";

export type CmsSlotCompositionComponentsCatalogProps = {
  searchFieldId: string;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void;
};

type CompositionComponentCatalogSearchProps = {
  searchFieldId: string;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
};

export function CompositionComponentCatalogSearch(props: CompositionComponentCatalogSearchProps) {
  const { searchFieldId, componentQuery, setComponentQuery, catalogLoading } = props;
  const showCatalogLoading = useDeferredLoadingIndicator(catalogLoading);

  return (
    <InputSearch
      id={searchFieldId}
      value={componentQuery}
      onChange={(event) => setComponentQuery(event.target.value)}
      autoComplete="off"
      aria-busy={showCatalogLoading}
      placeholder={CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER}
    />
  );
}

export function CmsSlotCompositionComponentsCatalogList(
  props: Pick<
    CmsSlotCompositionComponentsCatalogProps,
    "catalogLoading" | "catalogError" | "componentCatalog" | "selectedComponentIdSet" | "addPending" | "onAddComponent"
  >
) {
  const { catalogLoading, catalogError, componentCatalog, selectedComponentIdSet, addPending, onAddComponent } = props;
  const showCatalogLoading = useDeferredLoadingIndicator(catalogLoading);

  return (
    <DrawerScrollList
      aria-label={CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LIST_ARIA_LABEL}
      data-slot="cms_slots_component_catalog_list"
      loading={showCatalogLoading}
      loadingAriaLabel={CMS_SLOTS_DESIGNER_COMPONENT_LIBRARY_LOADING_ARIA_LABEL}
      error={catalogError}
      isEmpty={componentCatalog.length === 0 && !showCatalogLoading}
    >
      {componentCatalog.map((component) => {
        const isAlreadyAdded = selectedComponentIdSet.has(component.id);
        // Once a component is in the pool it is disabled here; further seeds for other variants are added from the
        // component sheet's "Add variant" action, not by re-picking from the catalog.
        const disabled = addPending || catalogLoading || isAlreadyAdded;

        return (
          <DrawerScrollListAddActionRow
            key={component.id}
            label={component.name}
            added={isAlreadyAdded}
            disabled={disabled}
            ariaLabel={isAlreadyAdded ? `${component.name} already added` : `Add ${component.name}`}
            onClick={() => void onAddComponent(component)}
          />
        );
      })}
    </DrawerScrollList>
  );
}
