import { describe, expect, it } from "vitest";
import {
  buildCmsSlotRuntimePropRow,
  type ComposableInstancePropMeta,
  mergeComposableMetaWithLiveResolved,
  pickRemappedPropValue,
} from "@/features/cms-slots/model/cms-slot-composable-props";

const E = (propId: string, label: string, valueType: string): ComposableInstancePropMeta => ({
  propId,
  label,
  valueType,
});

describe("mergeComposableMetaWithLiveResolved", () => {
  it("matches by propId with case differences", () => {
    const exposed = [E("AbCdEf", "Title", "string")];
    const live = [E("abcdef", "Title", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("abcdef");
    expect(aliasToCanonical.get("AbCdEf")).toBe("abcdef");
  });

  it("rebinds by label+valueType when id disappeared", () => {
    const exposed = [E("old-internal-id", "Headline", "string")];
    const live = [E("new-internal-id", "Headline", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("new-internal-id");
    expect(aliasToCanonical.get("old-internal-id")).toBe("new-internal-id");
  });

  it("does not guess when two live props share label+valueType", () => {
    const exposed = [E("gone", "Status", "string")];
    const live = [E("a", "Status", "string"), E("b", "Status", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(exposed, live);
    expect(metas[0].propId).toBe("gone");
    expect(aliasToCanonical.get("gone")).toBe("gone");
  });
});

describe("pickRemappedPropValue + buildCmsSlotRuntimePropRow", () => {
  it("resolves values from legacy keys and emits every exposed id", () => {
    const live = [E("new-id", "Headline", "string")];
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved([E("old-id", "Headline", "string")], live);
    const values = { "old-id": "hello" };
    expect(pickRemappedPropValue("new-id", values, aliasToCanonical)).toBe("hello");
    const row = buildCmsSlotRuntimePropRow({ propValues: values }, metas, aliasToCanonical);
    expect(row).toEqual({ "new-id": "hello" });
  });

  it("picks by case-only variant in stored JSON", () => {
    const { metas, aliasToCanonical } = mergeComposableMetaWithLiveResolved(
      [E("X", "L", "string")],
      [E("x", "L", "string")]
    );
    const v = pickRemappedPropValue("x", { X: "v" }, aliasToCanonical);
    expect(v).toBe("v");
    const row = buildCmsSlotRuntimePropRow({ propValues: { X: "v" } }, metas, aliasToCanonical);
    expect(row).toEqual({ x: "v" });
  });
});
