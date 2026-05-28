import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { cva } from "class-variance-authority";
import { Loader2, Plus } from "lucide-react";
import {
  CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LIST_ARIA_LABEL,
  CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LOADING_ARIA_LABEL,
  CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER,
} from "@/shared/lib/cms-slots-feature-copy";
import { SearchInput } from "@/shared/ui/search-input";

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

const compositionComponentCatalogListRootClass = "flex min-w-0 flex-col gap-2";
const compositionComponentCatalogListShellClass = "relative min-h-48 min-w-0";
const compositionComponentCatalogListLoaderClass =
  "pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-popover/75 backdrop-blur-[1px]";
const compositionComponentCatalogListClass = "m-0 list-none p-0";
const compositionComponentCatalogListItemClass = "border-b border-border/80 last:border-b-0";
const compositionComponentCatalogErrorClass = "text-sm text-destructive";

const compositionComponentCatalogListItemButtonVariants = cva(
  "flex w-full min-w-0 items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
);

const compositionComponentCatalogListItemNameVariants = cva("min-w-0 truncate text-sm", {
  variants: {
    added: {
      true: "text-muted-foreground",
      false: "font-normal text-foreground",
    },
  },
  defaultVariants: {
    added: false,
  },
});

const compositionComponentCatalogListItemAddBadgeVariants = cva(
  "flex size-5 shrink-0 items-center justify-center rounded-full border",
  {
    variants: {
      added: {
        true: "border-border/60 text-muted-foreground",
        false: "border-border text-foreground",
      },
    },
    defaultVariants: {
      added: false,
    },
  }
);

type CompositionComponentCatalogListItemProps = {
  component: ComponentSearchResult;
  added: boolean;
  disabled: boolean;
  onAdd: () => void;
};

function CompositionComponentCatalogListItem(props: CompositionComponentCatalogListItemProps) {
  const { component, added, disabled, onAdd } = props;

  return (
    <li className={compositionComponentCatalogListItemClass}>
      <button
        type="button"
        className={compositionComponentCatalogListItemButtonVariants()}
        onClick={() => void onAdd()}
        disabled={disabled}
        aria-disabled={added}
        aria-label={added ? `${component.name} already added` : `Add ${component.name}`}
      >
        <span className={compositionComponentCatalogListItemNameVariants({ added })}>{component.name}</span>
        <span className={compositionComponentCatalogListItemAddBadgeVariants({ added })} aria-hidden>
          <Plus className="size-2.5 stroke-[1.5]" />
        </span>
      </button>
    </li>
  );
}

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
    <SearchInput
      id={searchFieldId}
      value={componentQuery}
      onChange={(event) => setComponentQuery(event.target.value)}
      autoComplete="off"
      aria-busy={showCatalogLoading}
      placeholder={CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_SEARCH_PLACEHOLDER}
      onPointerDown={(event) => event.stopPropagation()}
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
    <div className={compositionComponentCatalogListRootClass} data-slot="cms_slots_component_catalog_list">
      {catalogError ? (
        <p className={compositionComponentCatalogErrorClass} role="alert">
          {catalogError}
        </p>
      ) : null}

      <div className={compositionComponentCatalogListShellClass} data-state={showCatalogLoading ? "loading" : "idle"}>
        {showCatalogLoading ? (
          <div
            className={compositionComponentCatalogListLoaderClass}
            data-slot="cms_slots_component_catalog_loader"
            role="status"
            aria-live="polite"
            aria-label={CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LOADING_ARIA_LABEL}
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        {componentCatalog.length === 0 && !showCatalogLoading ? (
          <div className="min-h-28" aria-hidden />
        ) : (
          <ul
            className={compositionComponentCatalogListClass}
            aria-label={CMS_SLOTS_ENGINE_COMPONENT_LIBRARY_LIST_ARIA_LABEL}
          >
            {componentCatalog.map((component) => {
              const isAlreadyAdded = selectedComponentIdSet.has(component.id);
              const disabled = addPending || catalogLoading || isAlreadyAdded;

              return (
                <CompositionComponentCatalogListItem
                  key={component.id}
                  component={component}
                  added={isAlreadyAdded}
                  disabled={disabled}
                  onAdd={() => void onAddComponent(component)}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
