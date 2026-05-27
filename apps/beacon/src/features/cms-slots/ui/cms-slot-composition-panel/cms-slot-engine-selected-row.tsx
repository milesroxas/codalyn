import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { ComposerSlotNameDrawer } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-slot-name-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";

function sameExposedPropSelection(a: ComposableInstancePropMeta[], b: ComposableInstancePropMeta[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const aa = [...a.map((x) => x.propId)].sort();
  const bb = [...b.map((x) => x.propId)].sort();
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) {
      return false;
    }
  }
  return true;
}

function snapshotExposed(exposed: ComposableInstancePropMeta[]): ComposableInstancePropMeta[] {
  return exposed.map((x) => ({ ...x }));
}

type CmsSlotEngineSelectedRowProps = {
  row: HydratedCmsSlotRow;
  slotIndex: number;
  /** Resolved from the same runtime JSON `n[]` Composer uses (see {@link publishedDisplayNamesForEnginePool}). */
  publishedDisplayName: string;
  onRenamePublishedDisplayName: (rowKey: string, nextName: string) => void;
  renamingPublishedSlotKey: string | null;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  composableLoading: boolean;
  composableMetaReady: boolean;
  addPending: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingEngineSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncEngineSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  /** When set to this row’s `key`, opens the expose/tag drawer once (e.g. right after adding the component). */
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
  routeInteractionIdle?: boolean;
};

export function CmsSlotEngineSelectedRow(props: CmsSlotEngineSelectedRowProps) {
  const {
    row,
    slotIndex,
    publishedDisplayName,
    onRenamePublishedDisplayName,
    renamingPublishedSlotKey,
    available,
    slotExposed,
    composableLoading,
    composableMetaReady,
    addPending,
    removingKey,
    listTargetActionBusy,
    resyncingEngineSlotKey,
    onRemove,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
    routeInteractionIdle = true,
  } = props;
  const showComposableLoading = useDeferredLoadingIndicator(composableLoading);

  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false);
  const [closeBeforeTagDialogOpen, setCloseBeforeTagDialogOpen] = useState(false);
  const exposeBaselineRef = useRef<ComposableInstancePropMeta[]>([]);
  const exposedCount = slotExposed.length;

  const hasNewExposeSelections = propsDrawerOpen && !sameExposedPropSelection(slotExposed, exposeBaselineRef.current);

  const openExposeDrawer = useCallback(() => {
    exposeBaselineRef.current = snapshotExposed(slotExposed);
    setPropsDrawerOpen(true);
  }, [slotExposed]);

  useEffect(() => {
    if (autoOpenExposeDrawerRowKey !== row.key) {
      return;
    }
    if (addPending || listTargetActionBusy || composableLoading || !composableMetaReady || !routeInteractionIdle) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      openExposeDrawer();
      onAutoOpenExposeDrawerConsumed?.();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    addPending,
    autoOpenExposeDrawerRowKey,
    composableLoading,
    composableMetaReady,
    listTargetActionBusy,
    onAutoOpenExposeDrawerConsumed,
    openExposeDrawer,
    routeInteractionIdle,
    row.key,
  ]);

  const handlePropsDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setPropsDrawerOpen(true);
        return;
      }
      if (sameExposedPropSelection(slotExposed, exposeBaselineRef.current)) {
        setPropsDrawerOpen(false);
        return;
      }
      setCloseBeforeTagDialogOpen(true);
    },
    [slotExposed]
  );

  const handleDiscardExposeChangesClose = useCallback(() => {
    onSetSlotExposed(slotIndex, snapshotExposed(exposeBaselineRef.current));
    setCloseBeforeTagDialogOpen(false);
    setPropsDrawerOpen(false);
  }, [onSetSlotExposed, slotIndex]);

  const handleTagAttrsFromDismissDialog = useCallback(async () => {
    const ok = await onResyncEngineSlotAttrs(slotIndex);
    if (ok !== true) {
      return;
    }
    exposeBaselineRef.current = snapshotExposed(slotExposed);
    setCloseBeforeTagDialogOpen(false);
    setPropsDrawerOpen(false);
  }, [onResyncEngineSlotAttrs, slotIndex, slotExposed]);

  const handleTagAttrsFromFooter = useCallback(async () => {
    const ok = await onResyncEngineSlotAttrs(slotIndex);
    if (ok !== true) {
      return;
    }
    exposeBaselineRef.current = snapshotExposed(slotExposed);
  }, [onResyncEngineSlotAttrs, slotIndex, slotExposed]);
  const drawerRow: CmsSlotCompositionDraftRow = {
    key: row.key,
    componentId: row.componentId,
    name: publishedDisplayName,
  };
  const publishedRenameBusy = renamingPublishedSlotKey === row.key;

  return (
    <li>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0"
          aria-label={`Remove ${publishedDisplayName}`}
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={() => void onRemove(row)}
        >
          {removingKey === row.key ? <span className="text-xs">…</span> : <Trash2 aria-hidden className="size-3.5" />}
        </Button>
        <ComposerSlotNameDrawer
          row={drawerRow}
          exposed={[]}
          disabled={
            removingKey !== null || listTargetActionBusy || resyncingEngineSlotKey !== null || publishedRenameBusy
          }
          drawerTitle="Rename published slot"
          slotNameFieldLabel="Published name"
          onRename={(key, next) => onRenamePublishedDisplayName(key, next)}
          onChangePropValue={() => {}}
        />
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{exposedCount}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={openExposeDrawer}
        >
          Open
        </Button>
      </div>

      <Drawer open={propsDrawerOpen} onOpenChange={handlePropsDrawerOpenChange}>
        <DrawerContent stickyFooter className="border-border bg-popover text-popover-foreground ring-foreground/10">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-foreground">{publishedDisplayName}</DrawerTitle>
            <DrawerDescription>Choose which props to include for this slot.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3" data-slot="beacon_engine_exposed_props">
            {showComposableLoading && available.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                <Loader2 className="mr-1 inline size-4 animate-spin align-middle" aria-hidden />
                Loading…
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm text-muted-foreground">No composable props found for this component.</p>
            ) : (
              <ul className="m-0 list-none space-y-2.5 p-0 pb-2" aria-label="Composer props">
                {available.map((p) => {
                  const on = slotExposed.some((e) => e.propId === p.propId);
                  return (
                    <li key={p.propId} className="flex items-start gap-2.5 text-sm">
                      <Checkbox
                        id={`cms-slot-expose-${row.key}-${p.propId}`}
                        checked={on}
                        disabled={removingKey !== null || listTargetActionBusy || resyncingEngineSlotKey !== null}
                        onCheckedChange={(v) => {
                          if (v === "indeterminate") {
                            return;
                          }
                          const want = v === true;
                          const byId = new Map(slotExposed.map((e) => [e.propId, e]));
                          if (want) {
                            byId.set(p.propId, p);
                          } else {
                            byId.delete(p.propId);
                          }
                          onSetSlotExposed(slotIndex, [...byId.values()]);
                        }}
                      />
                      <label
                        className="min-w-0 flex-1 cursor-pointer leading-snug text-foreground"
                        htmlFor={`cms-slot-expose-${row.key}-${p.propId}`}
                      >
                        {p.label}
                        <span className="ml-1 font-mono text-xs text-muted-foreground">{p.valueType}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DrawerFooter className="mt-0 border-border border-t bg-popover pt-4 pb-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-full"
              disabled={
                removingKey !== null ||
                listTargetActionBusy ||
                resyncingEngineSlotKey !== null ||
                composableLoading ||
                !hasNewExposeSelections
              }
              aria-busy={resyncingEngineSlotKey === row.key}
              onClick={() => void handleTagAttrsFromFooter()}
            >
              {resyncingEngineSlotKey === row.key ? "Tagging…" : "Tag data attributes"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={closeBeforeTagDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCloseBeforeTagDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tag data attributes first?</AlertDialogTitle>
            <AlertDialogDescription>
              You picked new props—close after tagging so the canvas gets matching data attributes, or discard changes
              to restore the props you entered with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Continue editing</AlertDialogCancel>
            <AlertDialogCancel
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              onClick={handleDiscardExposeChangesClose}
            >
              Discard prop changes
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(ev) => {
                ev.preventDefault();
                void handleTagAttrsFromDismissDialog();
              }}
            >
              Tag data attributes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
