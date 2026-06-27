import { describe, expect, it } from "vitest";
import type { DesignerCodalynAttrSyncResult } from "@/features/cms-slots/model/cms-slot-designer-codalyn-attr-sync";
import {
  resolveResyncAllowedPoolKeys,
  resolveResyncNotice,
} from "@/features/cms-slots/model/resync-designer-slot-prop-attrs";
import {
  CMS_SLOTS_DESIGNER_RESYNC_NO_FIELDS,
  CMS_SLOTS_DESIGNER_RESYNC_NOTHING_BOUND,
  CMS_SLOTS_DESIGNER_RESYNC_UP_TO_DATE,
  CMS_SLOTS_DESIGNER_RESYNC_UPDATED,
} from "@/shared/lib/cms-slots-feature-copy";

function result(over: Partial<DesignerCodalynAttrSyncResult> = {}): DesignerCodalynAttrSyncResult {
  return {
    tagged: 0,
    removed: 0,
    matchedPropCount: 0,
    variantsWalked: 1,
    publishPlaceholdersSeeded: 0,
    errors: [],
    ...over,
  };
}

describe("resolveResyncNotice", () => {
  it("warns with the first error when the run reported errors", () => {
    const notice = resolveResyncNotice(result({ errors: ["boom", "second"] }), 2);
    expect(notice).toEqual({ type: "Warning", message: "boom" });
  });

  it("reports success when attrs changed (tagged or removed)", () => {
    expect(resolveResyncNotice(result({ tagged: 3 }), 2)).toEqual({
      type: "Success",
      message: CMS_SLOTS_DESIGNER_RESYNC_UPDATED,
    });
    expect(resolveResyncNotice(result({ removed: 1 }), 2)).toEqual({
      type: "Success",
      message: CMS_SLOTS_DESIGNER_RESYNC_UPDATED,
    });
  });

  it("treats an idempotent re-apply (fields wired, nothing changed) as already up to date — not a failure", () => {
    const notice = resolveResyncNotice(result({ tagged: 0, removed: 0, matchedPropCount: 2 }), 2);
    expect(notice).toEqual({ type: "Success", message: CMS_SLOTS_DESIGNER_RESYNC_UP_TO_DATE });
  });

  it("guides the user only when fields are selected but nothing is bound to them", () => {
    const notice = resolveResyncNotice(result({ tagged: 0, removed: 0, matchedPropCount: 0 }), 2);
    expect(notice).toEqual({ type: "Info", message: CMS_SLOTS_DESIGNER_RESYNC_NOTHING_BOUND });
  });

  it("stays calm when no fields are selected and nothing needed changing", () => {
    const notice = resolveResyncNotice(result(), 0);
    expect(notice).toEqual({ type: "Success", message: CMS_SLOTS_DESIGNER_RESYNC_NO_FIELDS });
  });
});

describe("resolveResyncAllowedPoolKeys", () => {
  it("keeps a just-staged seed that is in the selection but not yet in the configured attribute", () => {
    // The reproduction: a second component is added (staged) — its pool key lives in `selected` but the configured
    // attribute still only lists the committed first component. The allowlist must include the staged key so scoping
    // does not drop it and push slotIndex out of bounds.
    const configured = ["compA"];
    const selected = [{ poolKey: "compA" }, { poolKey: "compB" }];
    expect(resolveResyncAllowedPoolKeys(configured, selected)).toEqual(["compA", "compA", "compB"]);
  });

  it("equals the configured keys in steady state (selection matches what is persisted)", () => {
    const configured = ["compA", "compB"];
    const selected = [{ poolKey: "compA" }, { poolKey: "compB" }];
    expect(resolveResyncAllowedPoolKeys(configured, selected)).toEqual(["compA", "compB", "compA", "compB"]);
  });

  it("falls back to the selection when the configured attribute is empty (first staged seed)", () => {
    const selected = [{ poolKey: "compA~variant1" }];
    expect(resolveResyncAllowedPoolKeys([], selected)).toEqual(["compA~variant1"]);
  });
});
