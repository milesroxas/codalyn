import type { Area } from "react-easy-crop";

import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  getImageEditorPlacementReadiness,
  type ImageEditorPlacementBlocker,
} from "@/features/image-editor/lib/image-editor-placement-readiness";

export type ImageEditorPlaceButtonState = {
  disabled: boolean;
  label: string;
  busy: boolean;
};

const PLACEMENT_BLOCKER_LABELS: Record<ImageEditorPlacementBlocker, string> = {
  "missing-crop": "Crop first",
  "replace-wrong-type": "Select an Image",
  "selection-empty": "Select an element",
  "selection-props-loading": "Syncing…",
  "selection-pick-field": "Pick a field",
};

export type ImageEditorPlaceButtonInput = {
  exportPlaceBlockedLabel: string | null;
  exportSizeBlockedMessage: string | null;
  busy: boolean;
  foldersLoading: boolean;
  assetFolderCount: number;
  selectedAssetFolderId: string | null;
  cmsPrimaryUpload: boolean;
  elementCmsBindingLoading: boolean;
  completedCrop: Area | null;
  placement: PlacementMode;
  selectedElementType: string | null;
  componentImagePropsResolving: boolean;
  componentImagePropCount: number;
  selectedComponentImagePropId: string | null;
};

function placeButtonStateIfDownloadExport(
  p: Pick<
    ImageEditorPlaceButtonInput,
    | "placement"
    | "completedCrop"
    | "selectedElementType"
    | "componentImagePropsResolving"
    | "componentImagePropCount"
    | "selectedComponentImagePropId"
  >
): ImageEditorPlaceButtonState | null {
  if (p.placement !== "download") {
    return null;
  }
  const readiness = getImageEditorPlacementReadiness({
    placement: p.placement,
    hasCompletedCrop: p.completedCrop != null,
    selectedElementType: p.selectedElementType,
    componentImagePropsResolving: p.componentImagePropsResolving,
    componentImagePropCount: p.componentImagePropCount,
    selectedComponentImagePropId: p.selectedComponentImagePropId,
  });
  if (!readiness.ok) {
    return {
      disabled: true,
      label: PLACEMENT_BLOCKER_LABELS[readiness.blocker],
      busy: false,
    };
  }
  return { disabled: false, label: "Download image", busy: false };
}

function placeButtonStateBeforePlacementReadiness(p: ImageEditorPlaceButtonInput): ImageEditorPlaceButtonState | null {
  const {
    exportPlaceBlockedLabel,
    exportSizeBlockedMessage,
    busy,
    foldersLoading,
    assetFolderCount,
    selectedAssetFolderId,
    cmsPrimaryUpload,
    elementCmsBindingLoading,
    placement,
    selectedElementType,
  } = p;

  if (busy) {
    return { disabled: true, label: "Saving…", busy: true };
  }

  if (exportSizeBlockedMessage) {
    return { disabled: true, label: exportSizeBlockedMessage, busy: false };
  }

  if (exportPlaceBlockedLabel) {
    return { disabled: true, label: exportPlaceBlockedLabel, busy: false };
  }

  const downloadState = placeButtonStateIfDownloadExport(p);
  if (downloadState) {
    return downloadState;
  }

  if (foldersLoading && !cmsPrimaryUpload) {
    return { disabled: true, label: "Loading folders…", busy: false };
  }
  if (assetFolderCount === 0 && !cmsPrimaryUpload) {
    return { disabled: true, label: "Create an Assets folder", busy: false };
  }

  const selectionBindingLoading =
    elementCmsBindingLoading &&
    placement !== "canvas" &&
    placement !== "library" &&
    (placement === "replace"
      ? selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE
      : selectedElementType !== "ComponentInstance" && selectedElementType !== null);

  if (selectionBindingLoading) {
    return { disabled: true, label: "Syncing…", busy: false };
  }

  if (selectedAssetFolderId === null && !cmsPrimaryUpload) {
    return { disabled: true, label: "Choose a folder", busy: false };
  }

  return null;
}

/** Primary Save-step action label and enabled state (footer or inline). */
export function getImageEditorPlaceButtonState(p: ImageEditorPlaceButtonInput): ImageEditorPlaceButtonState {
  const gated = placeButtonStateBeforePlacementReadiness(p);
  if (gated) {
    return gated;
  }

  const {
    completedCrop,
    placement,
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    selectedComponentImagePropId,
  } = p;

  const readiness = getImageEditorPlacementReadiness({
    placement,
    hasCompletedCrop: completedCrop != null,
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    selectedComponentImagePropId,
  });

  if (!readiness.ok) {
    return {
      disabled: true,
      label: PLACEMENT_BLOCKER_LABELS[readiness.blocker],
      busy: false,
    };
  }

  if (placement === "library") {
    return { disabled: false, label: "Save to Assets", busy: false };
  }
  if (placement === "canvas") {
    return { disabled: false, label: "Add to page", busy: false };
  }
  if (placement === "replace") {
    return { disabled: false, label: "Replace image", busy: false };
  }
  if (placement === "compose") {
    return { disabled: false, label: "Add image", busy: false };
  }
  return { disabled: false, label: "Place image", busy: false };
}
