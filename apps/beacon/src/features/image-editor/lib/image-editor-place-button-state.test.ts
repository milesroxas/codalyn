import { describe, expect, it } from "vitest";

import { getImageEditorPlaceButtonState, type ImageEditorPlaceButtonInput } from "./image-editor-place-button-state";

function baseInput(overrides: Partial<ImageEditorPlaceButtonInput> = {}): ImageEditorPlaceButtonInput {
  return {
    exportPlaceBlockedLabel: null,
    exportSizeBlockedMessage: null,
    busy: false,
    foldersLoading: false,
    assetFolderCount: 1,
    selectedAssetFolderId: "folder-1",
    cmsPrimaryUpload: false,
    elementCmsBindingLoading: false,
    completedCrop: { x: 0, y: 0, width: 100, height: 100 },
    placement: "library",
    selectedElementType: "Image",
    componentImagePropsResolving: false,
    componentImagePropCount: 0,
    selectedComponentImagePropId: null,
    ...overrides,
  };
}

describe("getImageEditorPlaceButtonState", () => {
  it("disables save when export-size blocker is present", () => {
    const state = getImageEditorPlaceButtonState(
      baseInput({
        exportSizeBlockedMessage: "Over preset file limit",
      })
    );
    expect(state.disabled).toBe(true);
    expect(state.label).toBe("Over preset file limit");
  });

  it("keeps save enabled when no blockers apply", () => {
    const state = getImageEditorPlaceButtonState(baseInput());
    expect(state.disabled).toBe(false);
    expect(state.label).toBe("Save to Assets");
  });

  it("preserves existing blockers over normal save state", () => {
    const state = getImageEditorPlaceButtonState(
      baseInput({
        selectedAssetFolderId: null,
      })
    );
    expect(state.disabled).toBe(true);
    expect(state.label).toBe("Choose a folder");
  });
});
