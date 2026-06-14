import { describe, expect, it } from "vitest";

import {
  FLINT_SETTINGS_ERROR_CODES,
  getFlintSettingsTowerPutRejection,
  patchHasTeamFlintMutation,
} from "./flint-settings-tower-put.js";

describe("flint-settings-tower-put", () => {
  const allow = { editorExperience: false, canManageTeamFlintSettings: true };

  it("detects team mutations by persistable fields", () => {
    expect(patchHasTeamFlintMutation(null)).toBe(false);
    expect(patchHasTeamFlintMutation({})).toBe(false);
    expect(patchHasTeamFlintMutation({ globalIgnoredClasses: ["x"] })).toBe(true);
    // unknown/malformed fields are normalized away → not a mutation
    expect(patchHasTeamFlintMutation({ bogus: true } as never)).toBe(false);
  });

  it("allows non-team patches regardless of policy", () => {
    expect(
      getFlintSettingsTowerPutRejection(null, { editorExperience: true, canManageTeamFlintSettings: false })
    ).toBeNull();
  });

  it("locks team mutations in editor-experience mode", () => {
    expect(
      getFlintSettingsTowerPutRejection(
        { globalIgnoredClasses: ["x"] },
        { editorExperience: true, canManageTeamFlintSettings: true }
      )
    ).toBe(FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_LOCKED_EDITOR_MODE);
  });

  it("denies team mutations without manage permission", () => {
    expect(
      getFlintSettingsTowerPutRejection(
        { globalIgnoredClasses: ["x"] },
        { editorExperience: false, canManageTeamFlintSettings: false }
      )
    ).toBe(FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_PERMISSION_DENIED);
  });

  it("permits team mutations for an authorized manager", () => {
    expect(getFlintSettingsTowerPutRejection({ globalIgnoredClasses: ["x"] }, allow)).toBeNull();
  });
});
