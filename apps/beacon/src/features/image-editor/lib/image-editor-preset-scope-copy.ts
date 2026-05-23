import type { PresetCrudScope } from "@codalyn/webflow-kit";

export function imageEditorPresetScopeLabel(scope: PresetCrudScope): string {
  switch (scope) {
    case "site-default":
      return "Site default preset";
    case "element":
      return "Element preset";
    case "component":
      return "Component preset";
    case "instance":
      return "Instance preset";
  }
}

export function imageEditorPresetScopeDescription(scope: PresetCrudScope): string {
  switch (scope) {
    case "site-default":
      return "Apply as the default export preset for this site.";
    case "element":
      return "Apply across all instances of this image.";
    case "component":
      return "Apply across all instances of this component field.";
    case "instance":
      return "Apply only to this specific image.";
  }
}
