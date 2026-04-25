import { describe, expect, it } from "vitest";
import { draftToHiddenListIndices } from "@/features/beacons/model/beacon-composer-cms-draft";

describe("draftToHiddenListIndices", () => {
  it("maps draft to first matching instance per row in pool order", () => {
    const pool = [{ componentId: "a" }, { componentId: "b" }, { componentId: "a" }];
    const r = draftToHiddenListIndices(pool, [{ componentId: "a" }, { componentId: "a" }, { componentId: "b" }]);
    expect(r).toEqual({ ok: true, indices: [0, 2, 1] });
  });

  it("fails when an instance is missing", () => {
    const pool = [{ componentId: "a" }];
    expect(draftToHiddenListIndices(pool, [{ componentId: "a" }, { componentId: "a" }])).toEqual({ ok: false });
  });
});
