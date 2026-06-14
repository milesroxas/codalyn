import { describe, expect, it } from "vitest";

import {
  getDefaultFlintRuleConfig,
  mergeFlintRuleConfig,
  parseFlintRuleConfig,
  parseFlintRuleConfigPartial,
} from "./flint-rule-config.js";

describe("flint-rule-config", () => {
  it("parses a canonical config", () => {
    const raw = {
      version: 1,
      presetId: "lumos",
      enabledRules: ["lumos-custom-class-format"],
      ruleConfigs: { "lumos-custom-class-format": { maxWords: 4 } },
      ruleSeverities: { "lumos-custom-class-format": "error" },
      lastUpdated: "2026-06-14T00:00:00.000Z",
    };
    expect(parseFlintRuleConfig(raw)).toEqual(raw);
  });

  it("defaults ruleConfigs to {} for minimal payload", () => {
    expect(parseFlintRuleConfig({ version: 1 })).toEqual(getDefaultFlintRuleConfig());
  });

  it("returns empty default on malformed shape", () => {
    expect(parseFlintRuleConfig({ version: 2 })).toEqual(getDefaultFlintRuleConfig());
    expect(parseFlintRuleConfig({ version: 1, ruleSeverities: { r: "fatal" } })).toEqual(getDefaultFlintRuleConfig());
    expect(parseFlintRuleConfig(null)).toEqual(getDefaultFlintRuleConfig());
  });

  it("parses partial patches and drops malformed", () => {
    expect(parseFlintRuleConfigPartial({ enabledRules: ["a"] })).toEqual({ enabledRules: ["a"] });
    expect(parseFlintRuleConfigPartial({ enabledRules: [123] })).toEqual({});
  });

  describe("mergeFlintRuleConfig (team over personal)", () => {
    const base = {
      version: 1 as const,
      enabledRules: ["a", "b"],
      ruleConfigs: { a: { x: 1 }, b: { y: 2 } },
      ruleSeverities: { a: "warning" as const },
    };

    it("returns base when override is null", () => {
      expect(mergeFlintRuleConfig(base, null)).toBe(base);
    });

    it("overlays per-rule-id: override wins, others fall through", () => {
      const merged = mergeFlintRuleConfig(base, {
        version: 1,
        enabledRules: ["c"],
        ruleConfigs: { a: { x: 9 }, c: { z: 3 } },
        ruleSeverities: { a: "error" },
      });
      expect(merged.enabledRules).toEqual(["a", "b", "c"]);
      expect(merged.ruleConfigs).toEqual({ a: { x: 9 }, b: { y: 2 }, c: { z: 3 } });
      expect(merged.ruleSeverities).toEqual({ a: "error" });
    });
  });
});
