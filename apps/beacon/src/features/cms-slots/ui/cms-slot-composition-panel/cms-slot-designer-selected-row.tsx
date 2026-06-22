import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  type CmsSlotVariantControl,
  readVariantControlFromInstanceProps,
} from "@/features/cms-slots/model/cms-slot-instance-variant";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";
import { ComposerSlotNameDialog } from "@/features/cms-slots/ui/cms-slot-composer-panel/composer-slot-name-dialog";
import { CmsSlotDesignerExposePropsPanel } from "@/features/cms-slots/ui/cms-slot-composition-panel/cms-slot-designer-expose-props-panel";
import {
  useCmsSlotsDrawerDismissBlocked,
  useCmsSlotsRouteInteractionBlocked,
} from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import {
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_DISCARD_DIALOG_TITLE,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DESCRIPTION,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_TITLE,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_OPEN_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_PENDING_LABEL,
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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  drawerListSheetContentDefaults,
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

type CmsSlotDesignerSelectedRowProps = {
  row: HydratedCmsSlotRow;
  slotIndex: number;
  /** Resolved from the same runtime JSON `n[]` Composer uses (see {@link publishedDisplayNamesForDesignerPool}). */
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
  resyncingDesignerSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSeedVariant: (row: HydratedCmsSlotRow, propId: string, variantId: string) => void | Promise<void>;
  settingVariantKey: string | null;
  onAddVariant: (row: HydratedCmsSlotRow) => void | Promise<void>;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncDesignerSlotAttrs: (slotIndex: number) => boolean | Promise<boolean>;
  /** When set to this row’s `key`, opens the expose/tag drawer once (e.g. right after adding the component). */
  autoOpenExposeDrawerRowKey?: string | null;
  onAutoOpenExposeDrawerConsumed?: () => void;
};

export function CmsSlotDesignerSelectedRow(props: CmsSlotDesignerSelectedRowProps) {
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
    resyncingDesignerSlotKey,
    onRemove,
    onSetSeedVariant,
    settingVariantKey,
    onAddVariant,
    onSetSlotExposed,
    onResyncDesignerSlotAttrs,
    autoOpenExposeDrawerRowKey = null,
    onAutoOpenExposeDrawerConsumed,
  } = props;
  const showComposableLoading = useDeferredLoadingIndicator(composableLoading);
  const routeInteractionBlocked = useCmsSlotsRouteInteractionBlocked();

  const [variantControl, setVariantControl] = useState<CmsSlotVariantControl | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const instanceProps = await row.instance.searchProps();
        if (!cancelled) {
          setVariantControl(readVariantControlFromInstanceProps(instanceProps));
        }
      } catch {
        if (!cancelled) {
          setVariantControl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.instance]);

  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false);
  const [closeBeforeTagDialogOpen, setCloseBeforeTagDialogOpen] = useState(false);
  const [tagAttrsPending, setTagAttrsPending] = useState(false);
  // Captured when the drawer opens: a slot that already has exposed props is being updated, not set up.
  const [editingExistingSelection, setEditingExistingSelection] = useState(false);
  const tagAttrsPendingRef = useRef(false);
  const exposeBaselineRef = useRef<ComposableInstancePropMeta[]>([]);
  const exposedCount = slotExposed.length;

  const tagAttrsBusy = tagAttrsPending || resyncingDesignerSlotKey === row.key;
  const exposeDrawerDismissBlocked = useCmsSlotsDrawerDismissBlocked(tagAttrsBusy);

  const hasNewExposeSelections = propsDrawerOpen && !sameExposedPropSelection(slotExposed, exposeBaselineRef.current);

  const openExposeDrawer = useCallback(() => {
    exposeBaselineRef.current = snapshotExposed(slotExposed);
    setEditingExistingSelection(slotExposed.length > 0);
    setPropsDrawerOpen(true);
  }, [slotExposed]);

  const applyActionLabel = editingExistingSelection
    ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_LABEL
    : CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_LABEL;
  const discardDialogTitle = editingExistingSelection
    ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_APPLY_DISCARD_DIALOG_TITLE
    : CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_TITLE;

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
      if (tagAttrsPendingRef.current || resyncingDesignerSlotKey === row.key) {
        return;
      }
      if (sameExposedPropSelection(slotExposed, exposeBaselineRef.current)) {
        setPropsDrawerOpen(false);
        return;
      }
      setCloseBeforeTagDialogOpen(true);
    },
    [exposeDrawerDismissBlocked, resyncingDesignerSlotKey, row.key, slotExposed]
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
      const ok = await onResyncDesignerSlotAttrs(slotIndex);
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
  }, [onResyncDesignerSlotAttrs, slotIndex, slotExposed]);
  const drawerRow: CmsSlotCompositionDraftRow = {
    key: row.key,
    componentId: row.componentId,
    poolKey: row.poolKey,
    variant: row.variant,
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
        <ComposerSlotNameDialog
          row={drawerRow}
          exposed={[]}
          renameCommit="persist"
          disabled={
            removingKey !== null || listTargetActionBusy || resyncingDesignerSlotKey !== null || publishedRenameBusy
          }
          dialogTitle="Rename published slot"
          slotNameFieldLabel="Published name"
          onRename={(key, next) => onRenamePublishedDisplayName(key, next)}
          onChangePropValue={() => {}}
        />
        {row.variant != null ? (
          <Badge variant="accent" size="sm" className="shrink-0">
            {row.variant.variantName}
          </Badge>
        ) : null}
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{exposedCount}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={openExposeDrawer}
        >
          {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_OPEN_LABEL}
        </Button>
      </div>

      <Drawer
        open={propsDrawerOpen}
        interactionBlocked={exposeDrawerDismissBlocked}
        onOpenChange={handlePropsDrawerOpenChange}
      >
        <DrawerContent {...drawerListSheetContentDefaults}>
          <DrawerHeader align="start">
            <DrawerTitle>{publishedDisplayName}</DrawerTitle>
            <DrawerDescription>{CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DESCRIPTION}</DrawerDescription>
            {variantControl != null ? (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor={`${row.key}-variant`}>
                  Variant
                </label>
                <select
                  id={`${row.key}-variant`}
                  className="h-8 min-w-0 flex-1 rounded-sm border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  value={variantControl.selectedId}
                  disabled={settingVariantKey === row.key || removingKey !== null || listTargetActionBusy}
                  aria-label={`Variant for ${publishedDisplayName}`}
                  onChange={(e) => void onSetSeedVariant(row, variantControl.propId, e.target.value)}
                >
                  {variantControl.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={addPending || removingKey !== null || listTargetActionBusy}
                  onClick={() => {
                    setPropsDrawerOpen(false);
                    void onAddVariant(row);
                  }}
                >
                  Add variant
                </Button>
              </div>
            ) : null}
          </DrawerHeader>
          <CmsSlotDesignerExposePropsPanel
            rowKey={row.key}
            slotIndex={slotIndex}
            available={available}
            slotExposed={slotExposed}
            showComposableLoading={showComposableLoading}
            disabled={removingKey !== null || tagAttrsBusy}
            onSetSlotExposed={onSetSlotExposed}
          />
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
              {tagAttrsBusy ? CMS_SLOTS_DESIGNER_EXPOSE_PROPS_TAG_PENDING_LABEL : applyActionLabel}
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
            <AlertDialogTitle>{discardDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={tagAttrsBusy}>
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_CONTINUE_LABEL}
            </AlertDialogCancel>
            <AlertDialogCancel
              type="button"
              variant="outline"
              className="mt-2 sm:mt-0"
              disabled={tagAttrsBusy}
              onClick={handleDiscardExposeChangesClose}
            >
              {CMS_SLOTS_DESIGNER_EXPOSE_PROPS_DISCARD_DIALOG_DISCARD_LABEL}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={tagAttrsBusy}
              onClick={(ev) => {
                ev.preventDefault();
                void applyTagAttrsAndCloseDrawer();
              }}
            >
              {applyActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
