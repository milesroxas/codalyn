import { describe, expect, it } from "vitest";
import {
  type AccountDeletionBlocker,
  formatAccountDeletionBlockedMessage,
} from "@/shared/lib/membership/user-account-deletion";

describe("user-account-deletion re-exports", () => {
  it("formats blocked deletion messages through workspace ownership helpers", () => {
    const blockers: AccountDeletionBlocker[] = [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        reason: "sole_owner_workspace",
        memberCount: 1,
        otherMemberCount: 0,
        hasTeamSubscription: false,
      },
    ];
    expect(formatAccountDeletionBlockedMessage(blockers)).toContain("Permanently delete it now");
    expect(formatAccountDeletionBlockedMessage(blockers)).toContain("Team settings");
  });
});
