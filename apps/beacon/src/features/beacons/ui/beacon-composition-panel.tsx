import { HelpCircle, Loader2, Trash2 } from "lucide-react";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { BeaconEmbedSyncStrip } from "@/features/beacons/ui/beacon-embed-sync-strip";
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
  listTargetPhase: "loading" | "absent" | "synced" | "updating";
  /** How many list-render target instances for this list exist on the current page. */
  listTargetOnCanvasCount: number;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
  onSyncListTargetPreview: () => void;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetPreviewSyncPending: boolean;
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
};

type BeaconListTargetActionsProps = {
  activeDataList: string | null;
  removingKey: string | null;
  listTargetPhase: "loading" | "absent" | "synced" | "updating";
  listTargetActionBusy: boolean;
  listTargetCreatePending: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetPreviewSyncPending: boolean;
  listTargetOnCanvasCount: number;
  onBackToList: () => void;
  onCreateListTarget: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
  onSyncListTargetPreview: () => void;
};

function renderTargetButtonLabel(isPending: boolean): string {
  return isPending ? "Rendering…" : "Render target";
}

function BeaconListTargetSyncedActions(p: {
  ctaDisabled: boolean;
  listTargetRemovePending: boolean;
  listTargetPlaceOnCanvasPending: boolean;
  listTargetPreviewSyncPending: boolean;
  placeOrFocusLabel: string;
  placeOrFocusPendingLabel: string;
  onBackToList: () => void;
  onRequestRemoveListTarget: () => void;
  onPlaceListTargetOnCanvas: () => void;
  onSyncListTargetPreview: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={p.ctaDisabled}
        aria-busy={p.listTargetRemovePending}
        onClick={() => void p.onRequestRemoveListTarget()}
      >
        Remove target…
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => void p.onBackToList()}>
        Back to list
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={p.ctaDisabled}
        aria-busy={p.listTargetPlaceOnCanvasPending}
        onClick={() => void p.onPlaceListTargetOnCanvas()}
      >
        {p.listTargetPlaceOnCanvasPending ? p.placeOrFocusPendingLabel : p.placeOrFocusLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={p.ctaDisabled}
        aria-busy={p.listTargetPreviewSyncPending}
        onClick={() => void p.onSyncListTargetPreview()}
      >
        {renderTargetButtonLabel(p.listTargetPreviewSyncPending)}
      </Button>
    </>
  );
}

function BeaconListTargetActionsBar(props: BeaconListTargetActionsProps) {
  const {
    activeDataList,
    removingKey,
    listTargetPhase,
    listTargetActionBusy,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetPlaceOnCanvasPending,
    listTargetPreviewSyncPending,
    listTargetOnCanvasCount,
    onBackToList,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onPlaceListTargetOnCanvas,
    onSyncListTargetPreview,
  } = props;
  const ctaDisabled = listTargetActionBusy || removingKey !== null || activeDataList == null;
  const placeOrFocusLabel = listTargetOnCanvasCount > 0 ? "Focus on canvas" : "Place on canvas";
  const placeOrFocusPendingLabel = listTargetOnCanvasCount > 0 ? "Focusing…" : "Placing…";
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {listTargetPhase === "synced" ? (
        <BeaconListTargetSyncedActions
          ctaDisabled={ctaDisabled}
          listTargetRemovePending={listTargetRemovePending}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          listTargetPreviewSyncPending={listTargetPreviewSyncPending}
          placeOrFocusLabel={placeOrFocusLabel}
          placeOrFocusPendingLabel={placeOrFocusPendingLabel}
          onBackToList={onBackToList}
          onRequestRemoveListTarget={onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
          onSyncListTargetPreview={onSyncListTargetPreview}
        />
      ) : listTargetPhase === "absent" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={ctaDisabled}
            aria-busy={listTargetCreatePending}
            onClick={() => void onCreateListTarget()}
          >
            {listTargetCreatePending ? "Creating…" : "Create target"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
            Back to list
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="secondary" size="sm" disabled aria-busy>
            {listTargetPhase === "updating" ? "Updating…" : "Checking…"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void onBackToList()}>
            Back to list
          </Button>
        </>
      )}
    </div>
  );
}

function ListTargetCanvasStatusHint(props: {
  listTargetPhase: BeaconCompositionPanelProps["listTargetPhase"];
  count: number;
}) {
  const { listTargetPhase, count } = props;
  if (listTargetPhase !== "synced") {
    return null;
  }
  if (count > 0) {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-2 text-xs text-foreground"
        data-slot="beacon_list_target_on_canvas"
        role="status"
      >
        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            {count === 1 ? "List target is on this page" : `${count} list targets on this page`}
          </p>
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            {count === 1
              ? "Use Focus on canvas to select it in the Designer. Only one target per list is used — extra copies can be removed on the canvas."
              : "Use Focus on canvas to select the first one. Remove extras so a single list target remains on the page."}
          </p>
        </div>
      </div>
    );
  }
  return (
    <p className="text-xs leading-snug text-muted-foreground" data-slot="beacon_list_target_place_hint">
      No list target on this page yet. Use Place on canvas to add it; only one is allowed per list.
    </p>
  );
}

function ListTargetTextFieldHint(props: { listTargetPhase: BeaconCompositionPanelProps["listTargetPhase"] }) {
  if (props.listTargetPhase !== "synced") {
    return null;
  }
  return (
    <p
      className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2 text-xs text-muted-foreground"
      data-slot="beacon_list_target_text_field_hint"
    >
      <span className="font-medium text-foreground">Text</span> is created on the list target for you. Select a list
      target instance on the canvas to edit it in the right panel (optional copy / CMS).
    </p>
  );
}

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
    listTargetPhase,
    onCreateListTarget,
    onRequestRemoveListTarget,
    onPlaceListTargetOnCanvas,
    onSyncListTargetPreview,
    listTargetCreatePending,
    listTargetRemovePending,
    listTargetPlaceOnCanvasPending,
    listTargetPreviewSyncPending,
    listTargetOnCanvasCount,
    embedSyncPending,
    onSyncInstallEmbed,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
  } = props;

  const listTargetActionBusy =
    listTargetCreatePending ||
    listTargetRemovePending ||
    listTargetPlaceOnCanvasPending ||
    listTargetPreviewSyncPending ||
    listTargetPhase === "loading" ||
    listTargetPhase === "updating";

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
              Inside beacons-wrapper. The published runtime is injected as page footer custom code (Webflow Data API),
              not an HTML embed.
            </TooltipContent>
          </Tooltip>
        </div>
        <BeaconListTargetActionsBar
          activeDataList={activeDataList}
          removingKey={removingKey}
          listTargetPhase={listTargetPhase}
          listTargetActionBusy={listTargetActionBusy}
          listTargetCreatePending={listTargetCreatePending}
          listTargetRemovePending={listTargetRemovePending}
          listTargetPlaceOnCanvasPending={listTargetPlaceOnCanvasPending}
          listTargetPreviewSyncPending={listTargetPreviewSyncPending}
          listTargetOnCanvasCount={listTargetOnCanvasCount}
          onBackToList={onBackToList}
          onCreateListTarget={onCreateListTarget}
          onRequestRemoveListTarget={onRequestRemoveListTarget}
          onPlaceListTargetOnCanvas={onPlaceListTargetOnCanvas}
          onSyncListTargetPreview={onSyncListTargetPreview}
        />
      </div>

      <ListTargetTextFieldHint listTargetPhase={listTargetPhase} />

      <ListTargetCanvasStatusHint listTargetPhase={listTargetPhase} count={listTargetOnCanvasCount} />

      <BeaconEmbedSyncStrip
        dataSlot="beacon_embed_sync"
        embedSyncPending={embedSyncPending}
        disableButton={false}
        onSyncInstallEmbed={onSyncInstallEmbed}
        pageRuntimeStatusLoading={pageRuntimeStatusLoading}
        pageRuntimeSynced={pageRuntimeSynced}
        pageRuntimeSyncReason={pageRuntimeSyncReason}
        copy={{
          loading: "Checking…",
          synced: "Footer JS OK · publish for live.",
          unsyncedFallback: "Footer script missing or outdated.",
        }}
      />

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
                  disabled={removingKey !== null || listTargetActionBusy}
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
