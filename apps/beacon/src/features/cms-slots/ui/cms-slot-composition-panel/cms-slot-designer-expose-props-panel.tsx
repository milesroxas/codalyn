import {
  type ComposableInstancePropMeta,
  isCmsSlotUploadImageValueType,
  isExposedImagePropConstrained,
} from "@/features/cms-slots/model/cms-slot-composable-props";
import { ExportConstraintsFields } from "@/features/image-editor/ui/image-editor-preset-form-fields";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import {
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_EMPTY,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LIST_ARIA_LABEL,
  CMS_SLOTS_DESIGNER_EXPOSE_PROPS_LOADING,
} from "@/shared/lib/cms-slots-feature-copy";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { DrawerScrollList, DrawerScrollListItem } from "@/shared/ui/drawer-scroll-list";
import { StatusMessage } from "@/shared/ui/status-message";
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

function setSlotExposedPropImageExport(
  slotExposed: ComposableInstancePropMeta[],
  propId: string,
  imageExport: ComposableInstancePropMeta["imageExport"]
): ComposableInstancePropMeta[] {
  return slotExposed.map((entry) => (entry.propId === propId ? { ...entry, imageExport } : entry));
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
  const { settings } = useBeaconAppSettings();
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
        const exposedEntry = slotExposed.find((entry) => entry.propId === prop.propId);
        const checked = exposedEntry != null;
        const fieldId = `cms-slot-expose-${rowKey}-${prop.propId}`;
        const isUploadImage = isCmsSlotUploadImageValueType(prop.valueType);
        const showConstraints = checked && isUploadImage;
        const constraintsMissing = showConstraints && !isExposedImagePropConstrained(exposedEntry);

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
            {showConstraints ? (
              <div className="mt-2 space-y-2 pl-1" data-vaul-no-drag="">
                {constraintsMissing ? (
                  <StatusMessage tone="warning" size="sm">
                    Set the export size for this image before saving.
                  </StatusMessage>
                ) : null}
                <ExportConstraintsFields
                  key={prop.propId}
                  baseId={fieldId}
                  value={exposedEntry?.imageExport ?? null}
                  defaultQuality={settings.defaultExportQuality}
                  disabled={disabled}
                  onChange={(next) =>
                    onSetSlotExposed(
                      slotIndex,
                      setSlotExposedPropImageExport(slotExposed, prop.propId, next ?? undefined)
                    )
                  }
                />
              </div>
            ) : null}
          </DrawerScrollListItem>
        );
      })}
    </DrawerScrollList>
  );
}
