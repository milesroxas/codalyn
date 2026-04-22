import { HelpCircle, Loader2, Trash2 } from "lucide-react";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type BeaconCompositionPanelProps = {
  searchFieldId: string;
  activeDataList: string | null;
  onBackToList: () => void;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selected: HydratedBeaconComponent[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void;
  onRemove: (row: HydratedBeaconComponent) => void;
  removingKey: string | null;
  onCreateListTarget: () => void;
  listTargetPending: boolean;
};

export function BeaconCompositionPanel(props: BeaconCompositionPanelProps) {
  const {
    searchFieldId,
    activeDataList,
    onBackToList,
    componentQuery,
    setComponentQuery,
    catalogLoading,
    catalogError,
    componentCatalog,
    selected,
    selectedComponentIdSet,
    addPending,
    onAddComponent,
    onRemove,
    removingKey,
    onCreateListTarget,
    listTargetPending,
  } = props;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 font-medium text-foreground">Editing</span>
          {activeDataList != null ? (
            <code className="min-w-0 truncate font-mono text-[0.7rem]">{activeDataList}</code>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Where this lives">
                <HelpCircle className="size-3" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Inside beacons-wrapper (beacon lists first; HTML embed last for your published site if needed).
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={listTargetPending || removingKey !== null || activeDataList == null}
            aria-busy={listTargetPending}
            onClick={() => void onCreateListTarget()}
          >
            {listTargetPending ? "Creating…" : "Create target"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
            Back to list
          </Button>
        </div>
      </div>

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
                          isAlreadyAdded ? "font-medium break-words text-muted-foreground" : "font-medium break-words"
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Selected</p>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="space-y-1.5" aria-label="Selected components">
            {selected.map((row) => (
              <li
                key={row.key}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 text-sm break-words">{row.name}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${row.name}`}
                  disabled={removingKey !== null || listTargetPending}
                  onClick={() => void onRemove(row)}
                >
                  {removingKey === row.key ? (
                    <span className="text-xs">…</span>
                  ) : (
                    <Trash2 aria-hidden className="size-3.5" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
