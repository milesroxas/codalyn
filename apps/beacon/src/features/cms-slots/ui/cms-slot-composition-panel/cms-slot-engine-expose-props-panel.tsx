import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_EMPTY,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_LIST_ARIA_LABEL,
  CMS_SLOTS_ENGINE_EXPOSE_PROPS_LOADING,
} from "@/shared/lib/cms-slots-feature-copy";
import { CheckboxField, CheckboxFieldItem, CheckboxFieldList } from "@/shared/ui/checkbox-field";
import { StatusMessage } from "@/shared/ui/status-message";

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

export type CmsSlotEngineExposePropsPanelProps = {
  rowKey: string;
  slotIndex: number;
  available: ComposableInstancePropMeta[];
  slotExposed: ComposableInstancePropMeta[];
  showComposableLoading: boolean;
  disabled: boolean;
  onSetSlotExposed: (slotIndex: number, exposed: ComposableInstancePropMeta[]) => void;
};

export function CmsSlotEngineExposePropsPanel(props: CmsSlotEngineExposePropsPanelProps) {
  const { rowKey, slotIndex, available, slotExposed, showComposableLoading, disabled, onSetSlotExposed } = props;

  if (showComposableLoading && available.length === 0) {
    return <StatusMessage pending>{CMS_SLOTS_ENGINE_EXPOSE_PROPS_LOADING}</StatusMessage>;
  }

  if (available.length === 0) {
    return <StatusMessage>{CMS_SLOTS_ENGINE_EXPOSE_PROPS_EMPTY}</StatusMessage>;
  }

  return (
    <CheckboxFieldList aria-label={CMS_SLOTS_ENGINE_EXPOSE_PROPS_LIST_ARIA_LABEL}>
      {available.map((prop) => {
        const checked = slotExposed.some((entry) => entry.propId === prop.propId);
        const fieldId = `cms-slot-expose-${rowKey}-${prop.propId}`;

        return (
          <CheckboxFieldItem key={prop.propId}>
            <CheckboxField
              id={fieldId}
              label={prop.label}
              meta={prop.valueType}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(want) => {
                onSetSlotExposed(slotIndex, toggleSlotExposedProp(slotExposed, prop, want));
              }}
            />
          </CheckboxFieldItem>
        );
      })}
    </CheckboxFieldList>
  );
}
