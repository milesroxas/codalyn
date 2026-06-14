import { describe, expect, it } from "vitest";

import { dedupeFlintCustomPresets, mergeFlintCustomPresets, parseFlintCustomPresets } from "./flint-custom-presets.js";

const preset = (id: string, name = id, baseId = "lumos") => ({ id, name, baseId });

describe("flint-custom-presets", () => {
  it("parses a canonical list", () => {
    const raw = [preset("agency-a"), preset("agency-b", "Agency B", "client-first")];
    expect(parseFlintCustomPresets(raw)).toEqual(raw);
  });

  it("returns [] on malformed shape", () => {
    expect(parseFlintCustomPresets([{ id: "" }])).toEqual([]);
    expect(parseFlintCustomPresets("nope")).toEqual([]);
    expect(parseFlintCustomPresets(null)).toEqual([]);
  });

  it("dedupes by stable id, last wins", () => {
    const out = dedupeFlintCustomPresets([preset("x", "old"), preset("x", "new")]);
    expect(out).toEqual([preset("x", "new")]);
  });

  it("matches by id, not name", () => {
    const out = dedupeFlintCustomPresets([preset("a", "Same Name"), preset("b", "Same Name")]);
    expect(out).toHaveLength(2);
  });

  describe("mergeFlintCustomPresets (team over personal)", () => {
    it("returns personal when team empty", () => {
      expect(mergeFlintCustomPresets([preset("p")], [])).toEqual([preset("p")]);
    });

    it("team entry overrides personal sharing id; others preserved", () => {
      const merged = mergeFlintCustomPresets(
        [preset("shared", "personal"), preset("mine")],
        [preset("shared", "team"), preset("teamonly")]
      );
      // Map keeps first-insertion position even when the value is overridden by id.
      expect(merged).toEqual([preset("shared", "team"), preset("mine"), preset("teamonly")]);
    });
  });
});
