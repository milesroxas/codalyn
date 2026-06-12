import { describe, expect, it } from "vitest";
import type { DesignerCodalynAttrSyncResult } from "@/features/cms-slots/model/cms-slot-designer-codalyn-attr-sync";
import { resolveResyncNotice } from "@/features/cms-slots/model/resync-designer-slot-prop-attrs";
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
