import { describe, expect, it } from "vitest";
import {
  BEACON_BANK_CAP,
  BEACON_COMPOSITION_CAP,
  createEmptyBankConfig,
  createEmptyComposition,
  isBankCapReached,
  isBlockCapReached,
  parseBankConfig,
  parseComposition,
  serializeBankConfig,
  serializeComposition,
} from "./beacon-composition.js";

describe("parseComposition", () => {
  it("returns empty composition for null, undefined, empty string", () => {
    for (const input of [null, undefined, ""]) {
      const result = parseComposition(input);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.slots).toEqual({});
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseComposition("not json");
    expect(result.ok).toBe(false);
  });

  it("parses a valid multi-slot composition", () => {
    const comp = {
      v: 1,
      slots: {
        main: [{ id: "b1", componentId: "c1", overrides: { title: "x" } }],
        aside: [{ id: "b2", componentId: "c2", overrides: {} }],
      },
    };
    const result = parseComposition(JSON.stringify(comp));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.slots.main).toHaveLength(1);
      expect(result.value.slots.aside).toHaveLength(1);
    }
  });

  it("rejects missing componentId", () => {
    const result = parseComposition(JSON.stringify({ v: 1, slots: { main: [{ id: "b1" }] } }));
    expect(result.ok).toBe(false);
  });
});

describe("serializeComposition", () => {
  it("round-trips", () => {
    const c = createEmptyComposition();
    c.slots.main = [{ id: "b1", componentId: "c1", overrides: {} }];
    const serialized = serializeComposition(c);
    const parsed = parseComposition(serialized);
    expect(parsed.ok).toBe(true);
  });
});

describe("parseBankConfig / serializeBankConfig", () => {
  it("round-trips", () => {
    const cfg = createEmptyBankConfig("col_1");
    cfg.allowlist.push({ componentId: "c1", label: "Card", exposedStringProps: [] });
    cfg.slots.push({ name: "main", fieldSlug: "composition" });
    const serialized = serializeBankConfig(cfg);
    const parsed = parseBankConfig(serialized);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.allowlist).toHaveLength(1);
      expect(parsed.value.slots[0].name).toBe("main");
    }
  });

  it("rejects allowlist over cap", () => {
    const tooMany = {
      v: 1,
      targetCollectionId: "col_1",
      allowlist: Array.from({ length: BEACON_BANK_CAP + 1 }, (_, i) => ({
        componentId: `c${i}`,
        label: "",
        exposedStringProps: [],
      })),
      slots: [],
    };
    const result = parseBankConfig(JSON.stringify(tooMany));
    expect(result.ok).toBe(false);
  });
});

describe("caps", () => {
  it("isBlockCapReached honors cap", () => {
    const under = Array.from({ length: BEACON_COMPOSITION_CAP - 1 }, (_, i) => ({
      id: `b${i}`,
      componentId: "c",
      overrides: {},
    }));
    expect(isBlockCapReached(under)).toBe(false);
    expect(isBlockCapReached([...under, { id: "x", componentId: "c", overrides: {} }])).toBe(true);
  });

  it("isBankCapReached honors cap", () => {
    const under = Array.from({ length: BEACON_BANK_CAP - 1 }, (_, i) => ({
      componentId: `c${i}`,
      label: "",
      exposedStringProps: [],
    }));
    expect(isBankCapReached(under)).toBe(false);
    expect(isBankCapReached([...under, { componentId: "x", label: "", exposedStringProps: [] }])).toBe(true);
  });
});
