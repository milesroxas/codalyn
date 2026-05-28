import { describe, expect, it } from "vitest";
import { effectiveWorkspaceMembershipCount } from "@/features/tower-ui/lib/effective-workspace-membership-count";

describe("effectiveWorkspaceMembershipCount", () => {
  it("uses server count while client orgs are pending", () => {
    expect(effectiveWorkspaceMembershipCount(0, 2, true)).toBe(0);
  });

  it("uses max of server and client when orgs are loaded", () => {
    expect(effectiveWorkspaceMembershipCount(0, 2, false)).toBe(2);
    expect(effectiveWorkspaceMembershipCount(1, 0, false)).toBe(1);
  });
});
