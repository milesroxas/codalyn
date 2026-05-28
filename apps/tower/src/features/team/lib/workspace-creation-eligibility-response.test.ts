import { describe, expect, it } from "vitest";
import { parseWorkspaceCreationEligibilityPayload } from "@/features/team/lib/workspace-creation-eligibility-response";

describe("parseWorkspaceCreationEligibilityPayload", () => {
  it("accepts canonical shape", () => {
    expect(parseWorkspaceCreationEligibilityPayload({ canCreate: true, ownedWorkspaceCount: 1 })).toEqual({
      canCreate: true,
      ownedWorkspaceCount: 1,
    });
  });

  it("rejects missing canCreate", () => {
    expect(parseWorkspaceCreationEligibilityPayload({ ownedWorkspaceCount: 0 })).toBeNull();
  });

  it("rejects invalid ownedWorkspaceCount", () => {
    expect(parseWorkspaceCreationEligibilityPayload({ canCreate: false, ownedWorkspaceCount: -1 })).toBeNull();
    expect(parseWorkspaceCreationEligibilityPayload({ canCreate: false, ownedWorkspaceCount: "1" })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(parseWorkspaceCreationEligibilityPayload(null)).toBeNull();
  });
});
