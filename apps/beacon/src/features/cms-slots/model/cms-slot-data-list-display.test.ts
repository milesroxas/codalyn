import { describe, expect, it, vi } from "vitest";
import {
  decodeDisplayNameAttrValue,
  displayLabelForCmsSlotList,
  displayLabelForDataList,
  encodeDisplayNameAttrValue,
  readCmsSlotListDisplayName,
  writeCmsSlotListDisplayName,
} from "./cms-slot-data-list-display";

const DISPLAY_NAME_ATTR = "data-beacon-display-name";

/** Minimal Webflow `BlockElement` stub backing the custom-attribute store, modeling Webflow's quote rejection. */
function makeContainer(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getCustomAttribute: vi.fn(async (name: string) => (name in store ? store[name] : null)),
    setCustomAttribute: vi.fn(async (name: string, value: string) => {
      if (value.includes('"')) {
        throw new Error("Webflow setCustomAttribute rejects double quotes");
      }
      store[name] = value;
    }),
    removeCustomAttribute: vi.fn(async (name: string) => {
      delete store[name];
    }),
  };
}

describe("displayLabelForDataList", () => {
  it("strips the beacon- prefix", () => {
    expect(displayLabelForDataList("beacon-hero-cta")).toBe("hero-cta");
  });
});

describe("displayLabelForCmsSlotList", () => {
  it("prefers persisted display name over slug label", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: "Hero CTA",
      })
    ).toBe("Hero CTA");
  });

  it("falls back to slug label when display name is missing", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: null,
      })
    ).toBe("hero-cta");
  });

  it("ignores empty persisted display names", () => {
    expect(
      displayLabelForCmsSlotList({
        dataList: "beacon-hero-cta",
        displayName: "   ",
      })
    ).toBe("hero-cta");
  });
});

describe("encode/decodeDisplayNameAttrValue", () => {
  it("round-trips a plain label", () => {
    const encoded = encodeDisplayNameAttrValue("Hero CTA");
    expect(decodeDisplayNameAttrValue(encoded)).toBe("Hero CTA");
  });

  it("round-trips a label containing double quotes (Webflow-rejected char)", () => {
    const encoded = encodeDisplayNameAttrValue('Hero "Featured"');
    expect(encoded).not.toContain('"');
    expect(decodeDisplayNameAttrValue(encoded)).toBe('Hero "Featured"');
  });

  it("round-trips non-ASCII labels", () => {
    const encoded = encodeDisplayNameAttrValue("Héró — “quote” 你好");
    expect(decodeDisplayNameAttrValue(encoded)).toBe("Héró — “quote” 你好");
  });

  it("returns legacy plain-text values verbatim (no b64: marker)", () => {
    expect(decodeDisplayNameAttrValue("Hero CTA")).toBe("Hero CTA");
  });

  it("returns malformed b64: payloads verbatim instead of throwing", () => {
    expect(decodeDisplayNameAttrValue("b64:!!!not-base64!!!")).toBe("b64:!!!not-base64!!!");
  });
});

describe("writeCmsSlotListDisplayName", () => {
  it("encodes the value so a quoted name does not get rejected by Webflow", async () => {
    const container = makeContainer();
    await expect(writeCmsSlotListDisplayName(container as never, 'Hero "Featured"')).resolves.toBeUndefined();
    expect(container.store[DISPLAY_NAME_ATTR]).not.toContain('"');
  });

  it("removes the attribute when the sanitized name is empty", async () => {
    const container = makeContainer({ [DISPLAY_NAME_ATTR]: "stale" });
    await writeCmsSlotListDisplayName(container as never, "   ");
    expect(container.removeCustomAttribute).toHaveBeenCalledWith(DISPLAY_NAME_ATTR);
    expect(DISPLAY_NAME_ATTR in container.store).toBe(false);
  });
});

describe("readCmsSlotListDisplayName", () => {
  it("round-trips a quoted name through write then read", async () => {
    const container = makeContainer();
    await writeCmsSlotListDisplayName(container as never, 'Hero "Featured"');
    expect(await readCmsSlotListDisplayName(container as never)).toBe('Hero "Featured"');
  });

  it("reads legacy plain-text values written before encoding", async () => {
    const container = makeContainer({ [DISPLAY_NAME_ATTR]: "Hero CTA" });
    expect(await readCmsSlotListDisplayName(container as never)).toBe("Hero CTA");
  });

  it("returns null when the attribute is absent", async () => {
    const container = makeContainer();
    expect(await readCmsSlotListDisplayName(container as never)).toBeNull();
  });
});
