import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_EMPTY,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LIST_ARIA_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LOADING,
} from "@/shared/lib/cms-slots-feature-copy";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { DrawerScrollList, DrawerScrollListItem } from "@/shared/ui/drawer-scroll-list";
import {
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

function toggleSlotExposedProp(
  slotExposed: ComposableInstancePropMeta[],
  prop: ComposableInstancePropMeta,
  want: boolean
): ComposableInstancePropMeta[] {
  const byId = new Map(slotExposed.map((entry) => [entry.propId, entry]));
  if (want) {
    byId.set(prop.propId, prop);
  } else {
    byId.delete(prop.propId);
  }
  return [...byId.values()];
}

export type CmsSlotDesignerExposePropsPanelProps = {
  rowKey: string;
  slotIndex: number;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  showComposableLoading: boolean;
  disabled: boolean;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
};

export function CmsSlotDesignerExposePropsPanel(props: CmsSlotDesignerExposePropsPanelProps) {
  const { rowKey, slotIndex, available, slotExposed, showComposableLoading, disabled, onSetSlotExposed } = props;
  const loading = showComposableLoading && available.length === 0;
  const isEmpty = available.length === 0 && !loading;

  return (
    <DrawerScrollList
      aria-label={CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LIST_ARIA_LABEL}
      data-slot="beacon_designer_exposed_props"
      loading={loading}
      loadingAriaLabel={CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LOADING}
      isEmpty={isEmpty}
      emptyMessage={CMS_SLOTS_DESIGNER_EXPOSE_PROPS_EMPTY}
    >
      {available.map((prop) => {
        const checked = slotExposed.some((entry) => entry.propId === prop.propId);
        const fieldId = `cms-slot-expose-${rowKey}-${prop.propId}`;

        return (
          <DrawerScrollListItem key={prop.propId}>
            <SurfaceSummaryCardSelectRow density="compact" htmlFor={fieldId} selected={checked} data-vaul-no-drag="">
              <SurfaceSummaryCardIconRowCopy>
                <SurfaceSummaryCardTitle density="compact">{prop.label}</SurfaceSummaryCardTitle>
                {prop.group != null ? <SurfaceSummaryCardMeta>{prop.group}</SurfaceSummaryCardMeta> : null}
              </SurfaceSummaryCardIconRowCopy>
              <Badge variant="accent" size="sm" className="shrink-0">
                {prop.valueType}
              </Badge>
              <SurfaceSummaryCardSelectRowControl>
                <Checkbox
                  id={fieldId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => {
                    if (value === "indeterminate") {
                      return;
                    }
                    onSetSlotExposed(slotIndex, toggleSlotExposedProp(slotExposed, prop, value === true));
                  }}
                />
              </SurfaceSummaryCardSelectRowControl>
            </SurfaceSummaryCardSelectRow>
          </DrawerScrollListItem>
        );
      })}
    </DrawerScrollList>
  );
}
