import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/shared/ui/drawer";

type CmsSlotEngineSelectedRowProps = {
  row: HydratedCmsSlotRow;
  slotIndex: number;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  composableLoading: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingEngineSlotKey: string | null;
  onRemove: (row: HydratedCmsSlotRow) => void;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncEngineSlotAttrs: (slotIndex: number) => void;
};

export function CmsSlotEngineSelectedRow(props: CmsSlotEngineSelectedRowProps) {
  const {
    row,
    slotIndex,
    available,
    slotExposed,
    composableLoading,
    removingKey,
    listTargetActionBusy,
    resyncingEngineSlotKey,
    onRemove,
    onSetSlotExposed,
    onResyncEngineSlotAttrs,
  } = props;

  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false);
  const exposedCount = slotExposed.length;

  return (
    <li>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
          aria-label={`Remove ${row.name}`}
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={() => void onRemove(row)}
        >
          {removingKey === row.key ? <span className="text-xs">…</span> : <Trash2 aria-hidden className="size-3.5" />}
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-normal text-white">{row.name}</span>
        <span className="shrink-0 tabular-nums text-xs text-zinc-500">{exposedCount}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 rounded-md border-zinc-500 bg-transparent px-2.5 text-xs font-normal text-white hover:bg-zinc-800"
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={() => setPropsDrawerOpen(true)}
        >
          Open
        </Button>
      </div>

      <Drawer open={propsDrawerOpen} onOpenChange={setPropsDrawerOpen}>
        <DrawerContent stickyFooter className="border-border bg-popover text-popover-foreground ring-foreground/10">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-foreground">{row.name}</DrawerTitle>
            <DrawerDescription>Choose which props to include for this slot.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3" data-slot="beacon_engine_exposed_props">
            {composableLoading && available.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                <Loader2 className="mr-1 inline size-4 animate-spin align-middle" aria-hidden />
                Loading…
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm text-muted-foreground">No composable props found for this component.</p>
            ) : (
              <ul className="m-0 list-none space-y-2.5 p-0 pb-2" aria-label="Studio props">
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
              disabled={removingKey !== null || resyncingEngineSlotKey !== null}
              aria-busy={resyncingEngineSlotKey === row.key}
              onClick={() => onResyncEngineSlotAttrs(slotIndex)}
            >
              {resyncingEngineSlotKey === row.key ? "Tagging…" : "Tag data attributes"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </li>
  );
}
