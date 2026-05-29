import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import { cmsSlotListTargetPhaseSettledForRouteSurface } from "@/features/cms-slots/model/cms-slot-list-target-settled";
import {
  shouldShowCmsSlotsComposerInstallInEngineEmpty,
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

export type CmsSlotsEngineRouteContentKey = "home" | "composition";

export type CmsSlotsEngineRouteSurfaceInput = {
  picking: boolean;
  openingBeaconKey: string | null;
  routeStateKnown: boolean;
  pageBootBlocking: boolean;
  listTargetPhase: CmsSlotListTargetPhase;
  editingContextPhase: CmsComposerEditingContextViewModel["phase"];
};

export function cmsSlotsEngineRouteContentKey(input: {
  picking: boolean;
  openingBeaconKey: string | null;
}): CmsSlotsEngineRouteContentKey {
  if (input.picking && input.openingBeaconKey == null) {
    return "composition";
  }
  return "home";
}

export function cmsSlotsEngineRouteContentReady(input: CmsSlotsEngineRouteSurfaceInput): boolean {
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

export function resolveCmsSlotsEngineRouteSurface(input: CmsSlotsEngineRouteSurfaceInput): {
  contentKey: CmsSlotsEngineRouteContentKey;
  contentReady: boolean;
} {
  return {
    contentKey: cmsSlotsEngineRouteContentKey({
      picking: input.picking,
      openingBeaconKey: input.openingBeaconKey,
    }),
    contentReady: cmsSlotsEngineRouteContentReady(input),
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
  if (input.composerOpeningKey != null) {
    return false;
  }
  if (input.composerEditingContextPhase === "loading") {
    return false;
  }
  if (input.activeComposer != null) {
    return true;
  }
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
  | "engine-install-prompt"
  | "engine-not-ready"
  | "list";

export function cmsSlotsComposerListPanelContentKey(input: {
  routeStateKnown: boolean;
  beaconsWrapperInstalled: boolean;
  showEditorNoSlotsEmpty: boolean;
  showEngineNotReadyEmpty: boolean;
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
  if (input.showEngineNotReadyEmpty) {
    return "engine-not-ready";
  }
  return "list";
}
