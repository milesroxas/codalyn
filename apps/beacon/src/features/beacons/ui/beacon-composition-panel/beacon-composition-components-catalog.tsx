import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/shared/ui/input";

type BeaconCompositionComponentsCatalogProps = {
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

export function BeaconCompositionComponentsCatalog(props: BeaconCompositionComponentsCatalogProps) {
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
      className="space-y-4 overflow-hidden rounded-[10px] border border-zinc-700/55 bg-[#1c1c1c] p-4 text-zinc-100 shadow-sm"
      data-slot="beacon_list"
    >
      <p className="text-xs leading-relaxed text-zinc-500">Add a list of components for this slot</p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-500"
          aria-hidden
        />
        <Input
          id={searchFieldId}
          value={componentQuery}
          onChange={(e) => setComponentQuery(e.target.value)}
          autoComplete="off"
          aria-busy={catalogLoading}
          placeholder="Search components"
          className="h-9 rounded-lg border-zinc-700 bg-zinc-800/85 px-2.5 py-1 pl-9 text-sm text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:border-zinc-600 focus-visible:ring-zinc-600/40"
        />
      </div>

      {catalogError ? (
        <p className="text-sm text-red-400" role="alert">
          {catalogError}
        </p>
      ) : null}

      <div className="relative -mx-1 h-40 shrink-0 overflow-hidden rounded-md">
        {catalogLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-[#1c1c1c]/75 backdrop-blur-[1px]"
            data-slot="beacon_list_loader"
            role="status"
            aria-live="polite"
            aria-label="Loading components"
          >
            <Loader2 className="size-5 animate-spin text-zinc-500" aria-hidden />
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
                  <li key={c.id} className="mx-2 border-b border-zinc-800/90 last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 disabled:pointer-events-none"
                      onClick={() => void onAddComponent(c)}
                      disabled={disabled}
                      aria-disabled={isAlreadyAdded}
                      aria-label={isAlreadyAdded ? `${c.name} already added` : `Add ${c.name}`}
                    >
                      <span
                        className={
                          isAlreadyAdded
                            ? "min-w-0 truncate text-sm text-zinc-500"
                            : "min-w-0 truncate text-sm font-normal text-white"
                        }
                      >
                        {c.name}
                      </span>
                      <span
                        className={
                          isAlreadyAdded
                            ? "flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-600"
                            : "flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-400 text-zinc-100"
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
