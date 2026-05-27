import { describe, expect, it } from "vitest";
import { CMS_SLOT_PUBLISH_PLACEHOLDER_URL } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { composerDraftRowHasContent } from "@/features/cms-slots/model/composer-draft-row-has-content";

describe("composerDraftRowHasContent", () => {
  it("returns false when propValues are missing or all empty", () => {
    expect(composerDraftRowHasContent({ propValues: undefined })).toBe(false);
    expect(composerDraftRowHasContent({ propValues: {} })).toBe(false);
    expect(composerDraftRowHasContent({ propValues: { title: "", body: "  " } })).toBe(false);
  });

  it("returns true when any prop value is set", () => {
    expect(composerDraftRowHasContent({ propValues: { title: "Hello" } })).toBe(true);
    expect(composerDraftRowHasContent({ propValues: { title: "", link: "https://example.com" } })).toBe(true);
    expect(composerDraftRowHasContent({ propValues: { title: "0" } })).toBe(true);
  });

  it("treats publish placeholder strings as content (Designer field semantics)", () => {
    expect(composerDraftRowHasContent({ propValues: { link: CMS_SLOT_PUBLISH_PLACEHOLDER_URL } })).toBe(true);
  });
});
