import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/shared/ui/input";

type CmsSlotCompositionComponentsCatalogProps = {
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

export function CmsSlotCompositionComponentsCatalog(props: CmsSlotCompositionComponentsCatalogProps) {
  const {
    searchFieldId,
    componentQuery,
    setComponentQuery,
    catalogLoading,
    catalogError,
    componentCatalog,
    selectedComponentIdSet,
    addPending,
    onAddComponent,
  } = props;

  return (
    <div
      className="space-y-4 overflow-hidden rounded-[10px] border border-border/70 bg-card p-4 text-card-foreground shadow-sm"
      data-slot="beacon_list"
    >
      <p className="text-xs leading-relaxed text-muted-foreground">Add a list of components for this slot</p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={searchFieldId}
          value={componentQuery}
          onChange={(e) => setComponentQuery(e.target.value)}
          autoComplete="off"
          aria-busy={catalogLoading}
          placeholder="Search components"
          className="h-9 pl-9"
        />
      </div>

      {catalogError ? (
        <p className="text-sm text-destructive" role="alert">
          {catalogError}
        </p>
      ) : null}

      <div className="relative -mx-1 h-40 shrink-0 overflow-hidden rounded-md">
        {catalogLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-card/75 backdrop-blur-[1px]"
            data-slot="beacon_list_loader"
            role="status"
            aria-live="polite"
            aria-label="Loading components"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        <div
          className="scrollbar-themed h-40 overflow-y-scroll rounded-md"
          data-state={catalogLoading ? "loading" : "idle"}
        >
          {componentCatalog.length === 0 && !catalogLoading ? (
            <div className="h-full min-h-28" aria-hidden />
          ) : (
            <ul className="px-1" aria-label="Components">
              {componentCatalog.map((c) => {
                const isAlreadyAdded = selectedComponentIdSet.has(c.id);
                const disabled = addPending || catalogLoading || isAlreadyAdded;
                return (
                  <li key={c.id} className="mx-2 border-b border-border/80 last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
                      onClick={() => void onAddComponent(c)}
                      disabled={disabled}
                      aria-disabled={isAlreadyAdded}
                      aria-label={isAlreadyAdded ? `${c.name} already added` : `Add ${c.name}`}
                    >
                      <span
                        className={
                          isAlreadyAdded
                            ? "min-w-0 truncate text-sm text-muted-foreground"
                            : "min-w-0 truncate text-sm font-normal text-foreground"
                        }
                      >
                        {c.name}
                      </span>
                      <span
                        className={
                          isAlreadyAdded
                            ? "flex size-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground"
                            : "flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
                        }
                        aria-hidden
                      >
                        <Plus className="size-2.5 stroke-[1.5]" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
