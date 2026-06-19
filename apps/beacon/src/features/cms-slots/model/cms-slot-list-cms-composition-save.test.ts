import { describe, expect, it } from "vitest";
import { setCmsSlotListTargetInstancesStaticRuntimeText } from "@/features/cms-slots/model/cms-slot-list-cms-composition-save";

describe("publish-boundary payload validation", () => {
  it("refuses to publish a non-v3 or malformed runtime payload to the list target Text prop", async () => {
    // The guard runs before any Webflow call, so it fails fast on invalid input rather than writing it. The runtime
    // never falls back to the Designer pool, so an invalid string would otherwise publish an empty slot.
    for (const bad of ["", "not-json", '{"v":2,"i":[0]}', '{"v":3}', "[]"]) {
      await expect(
        setCmsSlotListTargetInstancesStaticRuntimeText({
          dataList: "beacon-x",
          listContainer: {} as never,
          preferredDefinitionId: null,
          text: bad,
        })
      ).rejects.toThrow(/not valid v3 JSON/);
    }
  });
});
