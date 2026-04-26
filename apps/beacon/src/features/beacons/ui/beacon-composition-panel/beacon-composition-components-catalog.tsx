import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";

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
    <div className="space-y-2" data-slot="beacon_list">
      <Label htmlFor={searchFieldId}>Components</Label>
      <Input
        id={searchFieldId}
        value={componentQuery}
        onChange={(e) => setComponentQuery(e.target.value)}
        placeholder="Search components"
        autoComplete="off"
        aria-busy={catalogLoading}
      />
      {catalogError ? (
        <p className="text-sm text-destructive" role="alert">
          {catalogError}
        </p>
      ) : null}
      <div className="relative h-40 rounded-lg border border-border">
        {catalogLoading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
            data-slot="beacon_list_loader"
            role="status"
            aria-live="polite"
            aria-label="Loading components"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        <ScrollArea className="h-full min-h-0 pr-0.5 pl-0" data-state={catalogLoading ? "loading" : "idle"}>
          <ul className="p-1.5" aria-label="Components">
            {componentCatalog.length === 0 && !catalogLoading ? (
              <li className="px-2 py-4 text-center text-sm text-muted-foreground">None</li>
            ) : null}
            {componentCatalog.map((c) => {
              const isAlreadyAdded = selectedComponentIdSet.has(c.id);
              return (
                <li key={c.id} className="p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full min-w-0 flex-col items-stretch py-1.5 text-left"
                    onClick={() => void onAddComponent(c)}
                    disabled={addPending || catalogLoading || isAlreadyAdded}
                    aria-disabled={isAlreadyAdded}
                  >
                    <span
                      className={
                        isAlreadyAdded
                          ? "font-medium wrap-break-word text-muted-foreground"
                          : "font-medium wrap-break-word"
                      }
                    >
                      {c.name}
                      {isAlreadyAdded ? <span className="ml-1.5 text-xs text-muted-foreground">(added)</span> : null}
                    </span>
                    {c.group ? <span className="text-xs text-muted-foreground">{c.group}</span> : null}
                  </Button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
