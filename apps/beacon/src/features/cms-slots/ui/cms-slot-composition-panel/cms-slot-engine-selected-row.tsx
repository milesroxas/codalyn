import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { ComposerSlotNameDrawer } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-slot-name-drawer";
import { CmsSlotEngineExposePropsPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel/cms-slot-engine-expose-props-panel";
import {
  useCmsSlotsDrawerDismissBlocked,
  useCmsSlotsRouteInteractionBlocked,
} from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_DESCRIPTION,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_TITLE,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_OPEN_LABEL,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_TAG_LABEL,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_TAG_PENDING_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
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
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";

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
  } = props;
  const showComposableLoading = useDeferredLoadingIndicator(composableLoading);
  const routeInteractionBlocked = useCmsSlotsRouteInteractionBlocked();

  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false);
  const [closeBeforeTagDialogOpen, setCloseBeforeTagDialogOpen] = useState(false);
  const [tagAttrsPending, setTagAttrsPending] = useState(false);
  const tagAttrsPendingRef = useRef(false);
  const exposeBaselineRef = useRef<ComposableInstancePropMeta[]>([]);
  const exposedCount = slotExposed.length;

  const tagAttrsBusy = tagAttrsPending || resyncingEngineSlotKey === row.key;
  const exposeDrawerDismissBlocked = useCmsSlotsDrawerDismissBlocked(tagAttrsBusy);

  const hasNewExposeSelections = propsDrawerOpen && !sameExposedPropSelection(slotExposed, exposeBaselineRef.current);

  const openExposeDrawer = useCallback(() => {
    exposeBaselineRef.current = snapshotExposed(slotExposed);
    setPropsDrawerOpen(true);
  }, [slotExposed]);

  useEffect(() => {
    if (autoOpenExposeDrawerRowKey !== row.key) {
      return;
    }
    if (addPending || listTargetActionBusy || composableLoading || !composableMetaReady || routeInteractionBlocked) {
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
    routeInteractionBlocked,
    row.key,
  ]);

  const handlePropsDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setPropsDrawerOpen(true);
        return;
      }
      if (exposeDrawerDismissBlocked) {
        return;
      }
      if (tagAttrsPendingRef.current || resyncingEngineSlotKey === row.key) {
        return;
      }
      if (sameExposedPropSelection(slotExposed, exposeBaselineRef.current)) {
        setPropsDrawerOpen(false);
        return;
      }
      setCloseBeforeTagDialogOpen(true);
    },
    [exposeDrawerDismissBlocked, resyncingEngineSlotKey, row.key, slotExposed]
  );

  const handleDiscardExposeChangesClose = useCallback(() => {
    onSetSlotExposed(slotIndex, snapshotExposed(exposeBaselineRef.current));
    setCloseBeforeTagDialogOpen(false);
    setPropsDrawerOpen(false);
  }, [onSetSlotExposed, slotIndex]);

  const applyTagAttrsAndCloseDrawer = useCallback(async () => {
    if (tagAttrsPendingRef.current) {
      return;
    }
    tagAttrsPendingRef.current = true;
    setTagAttrsPending(true);
    try {
      const ok = await onResyncEngineSlotAttrs(slotIndex);
      if (ok !== true) {
        return;
      }
      exposeBaselineRef.current = snapshotExposed(slotExposed);
      setCloseBeforeTagDialogOpen(false);
      setPropsDrawerOpen(false);
    } finally {
      tagAttrsPendingRef.current = false;
      setTagAttrsPending(false);
    }
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
          {CMS_SLOTS_ENGINE_EXPOSE_PROPS_OPEN_LABEL}
        </Button>
      </div>

      <Drawer
        open={propsDrawerOpen}
        interactionBlocked={exposeDrawerDismissBlocked}
        onOpenChange={handlePropsDrawerOpenChange}
      >
        <DrawerContent stickyFooter>
          <DrawerHeader align="start">
            <DrawerTitle>{publishedDisplayName}</DrawerTitle>
            <DrawerDescription>{CMS_SLOTS_ENGINE_EXPOSE_PROPS_DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody data-slot="beacon_engine_exposed_props">
            <CmsSlotEngineExposePropsPanel
              rowKey={row.key}
              slotIndex={slotIndex}
              available={available}
              slotExposed={slotExposed}
              showComposableLoading={showComposableLoading}
              disabled={removingKey !== null || tagAttrsBusy}
              onSetSlotExposed={onSetSlotExposed}
            />
          </DrawerBody>
          <DrawerFooter layout="sticky">
            <Button
              type="button"
              variant="secondary"
              size="drawerAction"
              disabled={
                removingKey !== null ||
                listTargetActionBusy ||
                tagAttrsBusy ||
                composableLoading ||
                !hasNewExposeSelections
              }
              aria-busy={tagAttrsBusy}
              onClick={() => void applyTagAttrsAndCloseDrawer()}
            >
              {tagAttrsBusy ? CMS_SLOTS_ENGINE_EXPOSE_PROPS_TAG_PENDING_LABEL : CMS_SLOTS_ENGINE_EXPOSE_PROPS_TAG_LABEL}
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
            <AlertDialogTitle>{CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>{CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={tagAttrsBusy}>
              {CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL}
            </AlertDialogCancel>
            <AlertDialogCancel
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              disabled={tagAttrsBusy}
              onClick={handleDiscardExposeChangesClose}
            >
              {CMS_SLOTS_ENGINE_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={tagAttrsBusy}
              onClick={(ev) => {
                ev.preventDefault();
                void applyTagAttrsAndCloseDrawer();
              }}
            >
              {CMS_SLOTS_ENGINE_EXPOSE_PROPS_TAG_LABEL}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
