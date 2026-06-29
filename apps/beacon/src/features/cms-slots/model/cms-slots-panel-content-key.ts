import {
  shouldShowCmsSlotsComposerInstallInDesignerEmpty,
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

export type CmsSlotsDesignerRouteContentKey = "home" | "composition";

export type CmsSlotsDesignerRouteSurfaceInput = {
  picking: boolean;
  openingBeaconKey: string | null;
  routeStateKnown: boolean;
  pageBootBlocking: boolean;
};

export function cmsSlotsDesignerRouteContentKey(input: {
  picking: boolean;
  openingBeaconKey: string | null;
}): CmsSlotsDesignerRouteContentKey {
  if (input.picking && input.openingBeaconKey == null) {
    return "composition";
  }
  return "home";
}

export function cmsSlotsDesignerRouteContentReady(input: CmsSlotsDesignerRouteSurfaceInput): boolean {
  // Surface shows as soon as the first page scan is known. The clicked tile spins during open (openingBeaconKey
  // keeps the home key), composition renders slot rows + inline list-target loading, and the editing-context card
  // renders its own inline skeleton — so nothing here blanks the panel behind the full-screen overlay. Only the
  // first page scan (pageBootBlocking) holds it hidden, and that is prefetched before navigating in from home.
  return input.routeStateKnown && !input.pageBootBlocking;
}

export function resolveCmsSlotsDesignerRouteSurface(input: CmsSlotsDesignerRouteSurfaceInput): {
  contentKey: CmsSlotsDesignerRouteContentKey;
  contentReady: boolean;
} {
  return {
    contentKey: cmsSlotsDesignerRouteContentKey({
      picking: input.picking,
      openingBeaconKey: input.openingBeaconKey,
    }),
    contentReady: cmsSlotsDesignerRouteContentReady(input),
  };
}

export type CmsSlotsComposerRouteContentKey = "list" | "composer";

export type CmsSlotsComposerRouteSurfaceInput = {
  activeComposer: unknown | null;
  composerOpeningKey: string | null;
  routeStateKnown: boolean;
  pageBootBlocking: boolean;
  pageRuntimeStatusLoading: boolean;
  composerEligibleLoading: boolean;
  composerEligibleResolved: boolean;
};

export function cmsSlotsComposerListDataReady(input: {
  routeStateKnown: boolean;
  pageBootBlocking: boolean;
  pageRuntimeStatusLoading: boolean;
  composerEligibleLoading: boolean;
  composerEligibleResolved: boolean;
}): boolean {
  return (
    input.routeStateKnown &&
    !input.pageBootBlocking &&
    !input.pageRuntimeStatusLoading &&
    !input.composerEligibleLoading &&
    input.composerEligibleResolved
  );
}

export function cmsSlotsComposerRouteContentKey(input: {
  activeComposer: unknown | null;
  composerOpeningKey: string | null;
}): CmsSlotsComposerRouteContentKey {
  if (input.activeComposer != null && input.composerOpeningKey == null) {
    return "composer";
  }
  return "list";
}

export function cmsSlotsComposerRouteContentReady(input: CmsSlotsComposerRouteSurfaceInput): boolean {
  if (input.activeComposer != null) {
    return true;
  }
  // The list surface is visible as soon as the route is known. The panel renders its intro + editing-context card
  // (with its own inline skeleton) immediately and fills the eligible list inline once the scan resolves, so
  // crossing into the composer (and opening a slot — opening key keeps this key as "list") is a clean crossfade
  // over real content, never a blank panel stranded behind a full-screen overlay. Empty states stay gated on
  // `cmsSlotsComposerListDataReady` inside the panel, so "no slots" never flashes mid-scan.
  return input.routeStateKnown && !input.pageBootBlocking;
}

export function resolveCmsSlotsComposerRouteSurface(input: CmsSlotsComposerRouteSurfaceInput): {
  contentKey: CmsSlotsComposerRouteContentKey;
  contentReady: boolean;
} {
  return {
    contentKey: cmsSlotsComposerRouteContentKey({
      activeComposer: input.activeComposer,
      composerOpeningKey: input.composerOpeningKey,
    }),
    contentReady: cmsSlotsComposerRouteContentReady(input),
  };
}

export type CmsSlotsComposerListPanelContentKey =
  | "editor-empty"
  | "designer-install-prompt"
  | "designer-not-ready"
  | "list";

export function cmsSlotsComposerListPanelContentKey(input: {
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
  showEditorNoSlotsEmpty: boolean;
  showDesignerNotReadyEmpty: boolean;
  canAccessDesigner: boolean;
}): CmsSlotsComposerListPanelContentKey {
  if (input.showEditorNoSlotsEmpty) {
    return "editor-empty";
  }
  if (
    shouldShowCmsSlotsComposerInstallInDesignerEmpty({
      canAccessDesigner: input.canAccessDesigner,
      routeStateKnown: input.routeStateKnown,
      beaconsWrapperInstalled: input.beaconsWrapperInstalled,
    })
  ) {
    return "designer-install-prompt";
  }
  if (input.showDesignerNotReadyEmpty) {
    return "designer-not-ready";
  }
  return "list";
}
