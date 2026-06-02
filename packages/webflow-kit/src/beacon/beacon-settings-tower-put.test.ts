import { describe, expect, it } from "vitest";

import { BEACON_IMAGE_ERROR_CODES } from "./beacon-image-errors.js";
import {
  canPersistBeaconTeamExportDefaults,
  getBeaconSettingsTowerPutRejection,
  stripBeaconSettingsPersonalForEditorExperience,
} from "./beacon-settings-tower-put.js";

describe("getBeaconSettingsTowerPutRejection", () => {
  it("allows personal-only patches in editor experience", () => {
    expect(
      getBeaconSettingsTowerPutRejection(
        { theme: "dark" },
        {
          editorExperience: true,
          canManageTeamBeaconSettings: false,
        }
      )
    ).toBeNull();
  });

  it("blocks team preset patches in editor experience", () => {
    expect(
      getBeaconSettingsTowerPutRejection(
        { defaultExportFormat: "webp" },
        { editorExperience: true, canManageTeamBeaconSettings: true }
      )
    ).toBe(BEACON_IMAGE_ERROR_CODES.TEAM_PRESETS_LOCKED_EDITOR_MODE);
  });

  it("blocks team preset patches without manage permission", () => {
    expect(
      getBeaconSettingsTowerPutRejection(
        { imagePresetStorage: { siteDefault: null, byTargetKey: {} } },
        { editorExperience: false, canManageTeamBeaconSettings: false }
      )
    ).toBe(BEACON_IMAGE_ERROR_CODES.PRESET_PERMISSION_DENIED);
  });

  it("allows team preset patches for designers with manage permission", () => {
    expect(
      getBeaconSettingsTowerPutRejection(
        { limitCropZoomToNativeResolution: true },
        { editorExperience: false, canManageTeamBeaconSettings: true }
      )
    ).toBeNull();
  });
});

describe("stripBeaconSettingsPersonalForEditorExperience", () => {
  it("keeps theme only", () => {
    expect(
      stripBeaconSettingsPersonalForEditorExperience({
        theme: "light",
        cmsLayout: { fieldSlug: "body", enabledCollections: [] },
      })
    ).toEqual({ theme: "light" });
  });
});

describe("canPersistBeaconTeamExportDefaults", () => {
  it("is false in editor experience", () => {
    expect(
      canPersistBeaconTeamExportDefaults({
        editorExperience: true,
        canManageTeamBeaconSettings: true,
      })
    ).toBe(false);
  });

  it("is true for designers who manage team settings", () => {
    expect(
      canPersistBeaconTeamExportDefaults({
        editorExperience: false,
        canManageTeamBeaconSettings: true,
      })
    ).toBe(true);
  });
});
