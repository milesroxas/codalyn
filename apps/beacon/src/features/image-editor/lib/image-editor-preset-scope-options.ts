import type { PresetCrudScope } from "@codalyn/webflow-kit";
import { imageEditorPresetScopeLabel } from "@/features/image-editor/lib/image-editor-preset-scope-copy";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

export type PresetScopeOption = {
  scope: PresetCrudScope;
  label: string;
  enabled: boolean;
  reason?: string;
};

function scopeOptionReason(args: {
  hasSiteContext: boolean;
  hasPermission?: boolean;
  targetKind: ImagePageTarget["kind"] | null;
  scope: PresetCrudScope;
}): string | undefined {
  const { hasSiteContext, hasPermission = true, targetKind, scope } = args;
  if (!hasSiteContext) {
    return "Site context unavailable.";
  }
  if (scope === "site-default" && !hasPermission) {
    return "Requires team preset management permission.";
  }
  if (scope === "element" && targetKind !== "image") {
    return "Available for standalone images.";
  }
  if (scope === "component" && targetKind !== "component") {
    return "Available for component image props.";
  }
  return undefined;
}

export function buildPresetScopeOptions(input: {
  canManageTeamBeaconSettings: boolean;
  siteId: string | null;
  targetKind: ImagePageTarget["kind"] | null;
}): PresetScopeOption[] {
  const { canManageTeamBeaconSettings, siteId, targetKind } = input;
  const hasSiteContext = siteId != null;
  const imageTarget = targetKind === "image";
  const componentTarget = targetKind === "component";
  return [
    {
      scope: "site-default",
      label: imageEditorPresetScopeLabel("site-default"),
      enabled: hasSiteContext && canManageTeamBeaconSettings,
      reason: scopeOptionReason({
        hasSiteContext,
        hasPermission: canManageTeamBeaconSettings,
        targetKind,
        scope: "site-default",
      }),
    },
    {
      scope: "element",
      label: imageEditorPresetScopeLabel("element"),
      enabled: hasSiteContext && imageTarget,
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "element",
      }),
    },
    {
      scope: "component",
      label: imageEditorPresetScopeLabel("component"),
      enabled: hasSiteContext && componentTarget,
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "component",
      }),
    },
    {
      scope: "instance",
      label: imageEditorPresetScopeLabel("instance"),
      enabled: hasSiteContext && (imageTarget || componentTarget),
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "instance",
      }),
    },
  ];
}
