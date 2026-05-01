import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BEACON_LIST_TARGET_TEXT_PROP_NAME,
  beaconListTargetHasTextProp,
  ensureBeaconListTargetTextProp,
  tryAddBeaconListTargetTextPropDirectToDefinition,
} from "@/features/beacons/model/beacon-list-target-text-field";
import { BEACON_COMPONENT_STRING_PROPS_GROUP } from "@/shared/lib/beacon-component-string-prop";

const CAN_MODIFY_COMPONENTS = "canModifyComponents" as const;

type PropRow = Pick<Prop, "id" | "name" | "type" | "valueType">;

function textContentTextProp(id = "prop-text"): PropRow {
  return { id, name: BEACON_LIST_TARGET_TEXT_PROP_NAME, type: "textContent", valueType: "textContent" };
}

function legacyStringTextProp(id = "prop-str"): PropRow {
  return { id, name: BEACON_LIST_TARGET_TEXT_PROP_NAME, type: "string", valueType: "string" };
}

function installWebflowStub(overrides: { canModify?: boolean } = {}): void {
  const canModify = overrides.canModify ?? true;
  (globalThis as unknown as { webflow: WebflowApi }).webflow = {
    appModes: { canModifyComponents: CAN_MODIFY_COMPONENTS } as WebflowApi["appModes"],
    canForAppMode: vi.fn().mockResolvedValue({ [CAN_MODIFY_COMPONENTS]: canModify }),
  } as unknown as WebflowApi;
}

describe("beaconListTargetHasTextProp", () => {
  it("is true for a textContent prop named Text", async () => {
    const comp = { getProps: vi.fn().mockResolvedValue([textContentTextProp()]) };
    expect(await beaconListTargetHasTextProp(comp as unknown as Component)).toBe(true);
  });

  it("is true for legacy string prop named Text", async () => {
    const comp = { getProps: vi.fn().mockResolvedValue([legacyStringTextProp()]) };
    expect(await beaconListTargetHasTextProp(comp as unknown as Component)).toBe(true);
  });

  it("is false when Text is missing", async () => {
    const comp = {
      getProps: vi.fn().mockResolvedValue([{ id: "x", name: "Other", type: "string", valueType: "string" }]),
    };
    expect(await beaconListTargetHasTextProp(comp as unknown as Component)).toBe(false);
  });

  it("is false when name matches but type is neither textContent nor string", async () => {
    const comp = {
      getProps: vi
        .fn()
        .mockResolvedValue([{ id: "x", name: BEACON_LIST_TARGET_TEXT_PROP_NAME, type: "number", valueType: "number" }]),
    };
    expect(await beaconListTargetHasTextProp(comp as unknown as Component)).toBe(false);
  });
});

describe("tryAddBeaconListTargetTextPropDirectToDefinition", () => {
  let prev: unknown;
  beforeEach(() => {
    prev = (globalThis as { webflow?: unknown }).webflow;
  });
  afterEach(() => {
    (globalThis as { webflow?: unknown }).webflow = prev;
  });

  it("returns true and re-binds when Text already exists (can modify)", async () => {
    installWebflowStub({ canModify: true });
    const setSettings = vi.fn().mockResolvedValue(null);
    const searchSettings = vi.fn().mockResolvedValue({ body: { canBind: true, valueType: "textContent" } });
    const root = {
      type: "DOM" as const,
      textContent: true,
      searchSettings,
      setSettings,
      setTextContent: vi.fn().mockResolvedValue(null),
    };
    const def = {
      id: "def-1",
      getProps: vi.fn().mockResolvedValue([textContentTextProp()]),
      getRootElement: vi.fn().mockResolvedValue(root),
      createProps: vi.fn(),
    };
    const ok = await tryAddBeaconListTargetTextPropDirectToDefinition(def as unknown as Component);
    expect(ok).toBe(true);
    expect(def.createProps).not.toHaveBeenCalled();
    expect(setSettings).toHaveBeenCalledWith({ body: { sourceType: "prop", propId: "prop-text" } });
  });

  it("returns true without binding when Text exists and cannot modify", async () => {
    installWebflowStub({ canModify: false });
    const def = {
      getProps: vi.fn().mockResolvedValue([textContentTextProp()]),
      getRootElement: vi.fn(),
      createProps: vi.fn(),
    };
    const ok = await tryAddBeaconListTargetTextPropDirectToDefinition(def as unknown as Component);
    expect(ok).toBe(true);
    expect(def.getRootElement).not.toHaveBeenCalled();
  });

  it("creates the textContent prop and binds it to the first bindable text setting", async () => {
    installWebflowStub({ canModify: true });
    const setSettings = vi.fn().mockResolvedValue(null);
    const searchSettings = vi.fn().mockImplementation(async (opts: { valueType: string }) => {
      return opts.valueType === "textContent" ? { field: { canBind: true, valueType: "textContent" } } : {};
    });
    const root = {
      type: "DOM" as const,
      textContent: true,
      searchSettings,
      setSettings,
      setTextContent: vi.fn().mockResolvedValue(null),
    };
    const propAfter: PropRow = textContentTextProp("new-id");
    const getProps = vi
      .fn()
      .mockResolvedValueOnce([] as PropRow[])
      .mockResolvedValue([propAfter]);
    const createProps = vi
      .fn()
      .mockImplementation((rows: Array<{ type: string; name: string; group: string; defaultValue: string }>) => {
        expect(rows).toEqual([
          {
            type: "textContent",
            name: BEACON_LIST_TARGET_TEXT_PROP_NAME,
            group: BEACON_COMPONENT_STRING_PROPS_GROUP,
            defaultValue: "",
          },
        ]);
      });
    const def = { id: "def-1", getProps, getRootElement: vi.fn().mockResolvedValue(root), createProps };
    const ok = await tryAddBeaconListTargetTextPropDirectToDefinition(def as unknown as Component);
    expect(ok).toBe(true);
    expect(createProps).toHaveBeenCalledTimes(1);
    expect(setSettings).toHaveBeenCalledWith({ field: { sourceType: "prop", propId: "new-id" } });
  });

  it("returns false when createProps throws", async () => {
    installWebflowStub({ canModify: true });
    const def = {
      getProps: vi.fn().mockResolvedValue([]),
      createProps: vi.fn().mockRejectedValue(new Error("forbidden")),
    };
    const ok = await tryAddBeaconListTargetTextPropDirectToDefinition(def as unknown as Component);
    expect(ok).toBe(false);
  });

  it("returns false when canModifyComponents is false and prop is missing", async () => {
    installWebflowStub({ canModify: false });
    const def = { getProps: vi.fn().mockResolvedValue([]), createProps: vi.fn() };
    const ok = await tryAddBeaconListTargetTextPropDirectToDefinition(def as unknown as Component);
    expect(ok).toBe(false);
    expect(def.createProps).not.toHaveBeenCalled();
  });
});

describe("ensureBeaconListTargetTextProp", () => {
  let prev: unknown;
  beforeEach(() => {
    prev = (globalThis as { webflow?: unknown }).webflow;
  });
  afterEach(() => {
    (globalThis as { webflow?: unknown }).webflow = prev;
  });

  it("resolves when the prop already exists", async () => {
    installWebflowStub({ canModify: true });
    const setSettings = vi.fn().mockResolvedValue(null);
    const searchSettings = vi.fn().mockResolvedValue({ k: { canBind: true, valueType: "textContent" } });
    const root = {
      type: "DOM" as const,
      textContent: true,
      searchSettings,
      setSettings,
      setTextContent: vi.fn().mockResolvedValue(null),
    };
    const def = {
      id: "d1",
      getProps: vi.fn().mockResolvedValue([textContentTextProp()]),
      getRootElement: vi.fn().mockResolvedValue(root),
      createProps: vi.fn(),
    };
    await expect(ensureBeaconListTargetTextProp(def as unknown as Component)).resolves.toBeUndefined();
  });

  it("throws an actionable error when the prop is missing and createProps fails", async () => {
    installWebflowStub({ canModify: true });
    const def = {
      id: "def-2",
      getProps: vi.fn().mockResolvedValue([]),
      createProps: vi.fn().mockRejectedValue(new Error("direct create not available")),
      getRootElement: vi.fn(),
    };
    await expect(ensureBeaconListTargetTextProp(def as unknown as Component)).rejects.toThrow(/Text/);
  });
});
