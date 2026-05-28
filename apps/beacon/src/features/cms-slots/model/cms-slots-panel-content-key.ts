import {
  shouldShowCmsSlotsComposerInstallInEngineEmpty,
  shouldShowCmsSlotsPreInstall,
} from "@/features/cms-slots/model/cms-slots-access";

export type CmsSlotsHomePanelContentKey = "install" | "installed";

export function cmsSlotsHomePanelContentKey(input: {
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
}): CmsSlotsHomePanelContentKey {
  if (
    shouldShowCmsSlotsPreInstall({
      routeStateKnown: input.routeStateKnown,
      beaconsWrapperInstalled: input.beaconsWrapperInstalled,
    })
  ) {
    return "install";
  }
  return "installed";
}

export type CmsSlotsEngineRouteContentKey = "home" | "opening" | "composition";

export function cmsSlotsEngineRouteContentKey(input: {
  picking: boolean;
  openingBeaconKey: string | null;
}): CmsSlotsEngineRouteContentKey {
  if (input.picking) {
    return "composition";
  }
  if (input.openingBeaconKey != null) {
    return "opening";
  }
  return "home";
}

export type CmsSlotsComposerRouteContentKey = "list" | "opening" | "composer";

export function cmsSlotsComposerRouteContentKey(input: {
  activeComposer: unknown | null;
  composerOpeningKey: string | null;
}): CmsSlotsComposerRouteContentKey {
  if (input.activeComposer != null) {
    return "composer";
  }
  if (input.composerOpeningKey != null) {
    return "opening";
  }
  return "list";
}

export type CmsSlotsComposerListPanelContentKey = "editor-empty" | "engine-install-prompt" | "list";

export function cmsSlotsComposerListPanelContentKey(input: {
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
  showEditorNoSlotsEmpty: boolean;
  canAccessEngine: boolean;
}): CmsSlotsComposerListPanelContentKey {
  if (input.showEditorNoSlotsEmpty) {
    return "editor-empty";
  }
  if (
    shouldShowCmsSlotsComposerInstallInEngineEmpty({
      canAccessEngine: input.canAccessEngine,
      routeStateKnown: input.routeStateKnown,
      beaconsWrapperInstalled: input.beaconsWrapperInstalled,
    })
  ) {
    return "engine-install-prompt";
  }
  return "list";
}
