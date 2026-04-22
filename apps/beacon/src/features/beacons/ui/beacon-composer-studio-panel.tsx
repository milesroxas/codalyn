import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import type { BeaconCompositionDraftRow } from "@/features/beacons/model/site-components";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";

type BeaconComposerStudioPanelProps = {
  searchFieldId: string;
  activeDataList: string;
  draft: BeaconCompositionDraftRow[];
  dirty: boolean;
  componentQuery: string;
  setComponentQuery: (q: string) => void;
  catalogLoading: boolean;
  catalogError: string | null;
  componentCatalog: ComponentSearchResult[];
  selectedComponentIdSet: Set<string>;
  addPending: boolean;
  onAddComponent: (c: ComponentSearchResult) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  onRemove: (key: string) => void;
  onBack: () => void;
  onSave: () => void;
  savePending: boolean;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
};

export function BeaconComposerStudioPanel(props: BeaconComposerStudioPanelProps) {
  const {
    searchFieldId,
    activeDataList,
    draft,
    dirty,
    componentQuery,
    setComponentQuery,
    catalogLoading,
    catalogError,
    componentCatalog,
    selectedComponentIdSet,
    addPending,
    onAddComponent,
    onMoveUp,
    onMoveDown,
    onRemove,
    onBack,
    onSave,
    savePending,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
    embedSyncPending,
    onSyncInstallEmbed,
  } = props;

  const busy = savePending || addPending || embedSyncPending;

  return (
    <div className="space-y-4" data-slot="beacon_composer_studio">
      {!pageRuntimeStatusLoading && !pageRuntimeSynced ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-2 py-1.5"
          data-slot="beacon_composer_runtime_alert"
          role="alert"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <p className="text-xs text-muted-foreground">
              {pageRuntimeSyncReason ?? "Sync page script before saving."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={embedSyncPending}
            aria-busy={embedSyncPending}
            onClick={() => void onSyncInstallEmbed()}
          >
            {embedSyncPending ? "Syncing…" : "Sync"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Studio</p>
          <code className="mt-0.5 block truncate font-mono text-[0.7rem] text-muted-foreground">{activeDataList}</code>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onBack()}>
            Back
          </Button>
          <Button type="button" size="sm" disabled={!dirty || busy || draft.length === 0} onClick={() => void onSave()}>
            {savePending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <p className="text-xs leading-snug text-muted-foreground">
        Order is visitor order. Save updates canvas and preview; publish for live.
      </p>

      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2" aria-label="Composition tiles">
        {draft.length === 0 ? (
          <li className="sm:col-span-2">
            <p className="text-sm text-muted-foreground">Add components below.</p>
          </li>
        ) : null}
        {draft.map((row, index) => (
          <li key={row.key}>
            <Card className="overflow-hidden border-border/80 shadow-none">
              <CardContent className="flex flex-col gap-2 p-3">
                <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug break-words">{row.name}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Move ${row.name} up`}
                    disabled={busy || index === 0}
                    onClick={() => onMoveUp(row.key)}
                  >
                    <ChevronUp className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Move ${row.name} down`}
                    disabled={busy || index === draft.length - 1}
                    onClick={() => onMoveDown(row.key)}
                  >
                    <ChevronDown className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Remove ${row.name}`}
                    disabled={busy}
                    onClick={() => onRemove(row.key)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="space-y-2" data-slot="beacon_composer_add">
        <Label htmlFor={searchFieldId}>Add components</Label>
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
        <div className="relative h-36 rounded-lg border border-border">
          {catalogLoading ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
              aria-label="Loading components"
            >
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : null}
          <ScrollArea className="h-full min-h-0 pr-0.5 pl-0">
            <ul className="p-1.5" aria-label="Component catalog">
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
                        {isAlreadyAdded ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">(in list)</span>
                        ) : null}
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
    </div>
  );
}
