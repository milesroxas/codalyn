import { describe, expect, it } from "vitest";

import { getDefaultFlintAppSettings } from "./flint-app-settings.js";
import {
  mergeFlintOrgTeamSettingsIntoUser,
  parseFlintOrgTeamSettings,
  parseFlintOrgTeamSettingsPartial,
  selectFlintTeamCustomPresets,
  selectFlintTeamRuleConfig,
} from "./flint-org-team-settings.js";

describe("flint-org-team-settings", () => {
  it("parses canonical team settings", () => {
    const raw = {
      globalIgnoredClasses: ["w-dyn-item"],
      presetIgnoredClasses: { lumos: ["legacy_thing"] },
      ruleConfig: { version: 1, ruleConfigs: {} },
      customPresets: [{ id: "agency", name: "Agency", baseId: "lumos" }],
    };
    expect(parseFlintOrgTeamSettings(raw)).toEqual(raw);
  });

  it("returns {} on malformed shape", () => {
    expect(parseFlintOrgTeamSettings({ globalIgnoredClasses: [123] })).toEqual({});
    expect(parseFlintOrgTeamSettingsPartial({ ruleConfig: { version: 2 } })).toEqual({});
  });

  describe("mergeFlintOrgTeamSettingsIntoUser", () => {
    it("returns user unchanged when org is null", () => {
      const user = getDefaultFlintAppSettings();
      expect(mergeFlintOrgTeamSettingsIntoUser(user, null)).toBe(user);
    });

    it("applies team ignore lists over the member's personal settings", () => {
      const user = { ...getDefaultFlintAppSettings(), globalIgnoredClasses: ["mine"] };
      const merged = mergeFlintOrgTeamSettingsIntoUser(user, {
        globalIgnoredClasses: ["team-enforced"],
      });
      expect(merged.globalIgnoredClasses).toEqual(["team-enforced"]);
    });

    it("does not touch rule-config / custom presets (separate entities)", () => {
      const user = getDefaultFlintAppSettings();
      const merged = mergeFlintOrgTeamSettingsIntoUser(user, {
        ruleConfig: { version: 1, ruleConfigs: { a: { x: 1 } } },
      });
      expect(merged).toEqual(user);
    });
  });

  it("selectors extract team rule-config and presets", () => {
    const org = {
      ruleConfig: { version: 1 as const, ruleConfigs: {} },
      customPresets: [{ id: "a", name: "A", baseId: "lumos" }],
    };
    expect(selectFlintTeamRuleConfig(org)).toEqual(org.ruleConfig);
    expect(selectFlintTeamCustomPresets(org)).toEqual(org.customPresets);
    expect(selectFlintTeamRuleConfig(null)).toBeNull();
    expect(selectFlintTeamCustomPresets(undefined)).toEqual([]);
  });
});
