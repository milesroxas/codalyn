import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { cmsSlotListTargetPhaseSettledForRouteSurface } from "@/features/cms-slots/model/cms-slot-list-target-settled";
import {
  shouldShowCmsSlotsComposerInstallInDesignerEmpty,
  shouldShowCmsSlotsPreInstall,
} from "@/features/cms-slots/model/cms-slots-access";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";

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
  listTargetPhase: CmsSlotListTargetPhase;
  editingContextPhase: CmsComposerEditingContextViewModel["phase"];
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
  if (input.openingBeaconKey != null) {
    return false;
  }
  if (input.editingContextPhase === "loading") {
    return false;
  }
  if (input.picking) {
    return cmsSlotListTargetPhaseSettledForRouteSurface(input.listTargetPhase);
  }
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
  composerEditingContextPhase: CmsComposerEditingContextViewModel["phase"];
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
  if (input.composerEditingContextPhase === "loading") {
    return false;
  }
  if (input.activeComposer != null) {
    return true;
  }
  // While a slot is opening (composerOpeningKey set, activeComposer not yet resolved) the content key stays "list"
  // and the list itself is ready — keep it visible so the clicked tile's busy spinner shows instead of fading the
  // whole panel to blank. Tiles disable themselves during the open, so no second open can race. Readiness then
  // flips to the "composer" key in one batch when the open completes (activeComposer set + opening key cleared).
  return cmsSlotsComposerListDataReady(input);
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
