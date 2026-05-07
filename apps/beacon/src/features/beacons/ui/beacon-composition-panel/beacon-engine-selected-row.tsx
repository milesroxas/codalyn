import { Loader2, Trash2 } from "lucide-react";
import type { ComposableInstancePropMeta } from "@/features/beacons/model/beacon-composable-props";
import type { HydratedBeaconComponent } from "@/features/beacons/model/beacon-page-targets";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";

type BeaconEngineSelectedRowProps = {
  row: HydratedBeaconComponent;
  slotIndex: number;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  composableLoading: boolean;
  removingKey: string | null;
  listTargetActionBusy: boolean;
  resyncingEngineSlotKey: string | null;
  onRemove: (row: HydratedBeaconComponent) => void;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
  onResyncEngineSlotAttrs: (slotIndex: number) => void;
};

export function BeaconEngineSelectedRow(props: BeaconEngineSelectedRowProps) {
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
  return (
    <li className="space-y-1.5 rounded-sm border border-border bg-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm wrap-break-word">{row.name}</span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="shrink-0 text-destructive hover:bg-destructive/10"
          aria-label={`Remove ${row.name}`}
          disabled={removingKey !== null || listTargetActionBusy}
          onClick={() => void onRemove(row)}
        >
          {removingKey === row.key ? <span className="text-xs">…</span> : <Trash2 aria-hidden className="size-3.5" />}
        </Button>
      </div>
      <div className="space-y-1 border-t border-border/60 pt-1.5" data-slot="beacon_engine_exposed_props">
        {composableLoading && available.length === 0 ? (
          <p className="text-xs text-muted-foreground" role="status">
            <Loader2 className="mr-1 inline size-3 animate-spin align-middle" aria-hidden />
            Loading…
          </p>
        ) : available.length === 0 ? null : (
          <ul className="m-0 max-h-28 list-none space-y-1.5 overflow-y-auto p-0 pr-0.5" aria-label="Studio props">
            {available.map((p) => {
              const on = slotExposed.some((e) => e.propId === p.propId);
              return (
                <li key={p.propId} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    id={`beacon-expose-${row.key}-${p.propId}`}
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
                    className="min-w-0 flex-1 cursor-pointer leading-snug"
                    htmlFor={`beacon-expose-${row.key}-${p.propId}`}
                  >
                    {p.label}
                    <span className="ml-1 font-mono text-[0.6rem] text-muted-foreground">{p.valueType}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-0.5 border-t border-border/50 pt-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 w-full text-xs"
          disabled={removingKey !== null || resyncingEngineSlotKey !== null}
          aria-busy={resyncingEngineSlotKey === row.key}
          onClick={() => onResyncEngineSlotAttrs(slotIndex)}
        >
          {resyncingEngineSlotKey === row.key ? "Tagging…" : "Tag data attributes"}
        </Button>
      </div>
    </li>
  );
}
