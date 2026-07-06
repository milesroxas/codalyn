import { describe, expect, it } from "vitest";
import {
  accountWorkspacePurgeBillingNotice,
  accountWorkspacePurgeRowHint,
} from "@/features/account/lib/account-workspace-purge-copy";
import type { AccountDeletionBlocker } from "@/shared/lib/membership/user-account-deletion";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";

function blockerWith(overrides: Partial<AccountDeletionBlocker>): AccountDeletionBlocker {
  return {
    organizationId: "org-1",
    organizationName: "Acme",
    organizationSlug: "acme",
    reason: "sole_owner_workspace",
    memberCount: 1,
    otherMemberCount: 0,
    hasTeamSubscription: false,
    ...overrides,
  };
}

describe("accountWorkspacePurgeRowHint", () => {
  it("mentions the recovery window for pending-deletion workspaces", () => {
    expect(accountWorkspacePurgeRowHint(blockerWith({ reason: "workspace_pending_deletion" }))).toContain(
      String(WORKSPACE_SOFT_DELETE_RECOVERY_DAYS)
    );
  });

  it("labels sole-owner workspaces as personal", () => {
    expect(accountWorkspacePurgeRowHint(blockerWith({ reason: "sole_owner_workspace" }))).toContain("Personal");
  });

  it("returns nothing for reasons that are not purgeable in place", () => {
    expect(accountWorkspacePurgeRowHint(blockerWith({ reason: "workspace_owner" }))).toBe("");
    expect(accountWorkspacePurgeRowHint(blockerWith({ reason: "billing_owner" }))).toBe("");
  });
});

describe("accountWorkspacePurgeBillingNotice", () => {
  it("discloses cancellation for a sole-owner workspace with an active Team subscription", () => {
    expect(
      accountWorkspacePurgeBillingNotice(blockerWith({ reason: "sole_owner_workspace", hasTeamSubscription: true }))
    ).toContain("subscription");
  });

  it("is silent for a sole-owner workspace without a subscription", () => {
    expect(
      accountWorkspacePurgeBillingNotice(blockerWith({ reason: "sole_owner_workspace", hasTeamSubscription: false }))
    ).toBeNull();
  });

  it("is silent for pending-deletion workspaces even if flagged as subscribed", () => {
    expect(
      accountWorkspacePurgeBillingNotice(
        blockerWith({ reason: "workspace_pending_deletion", hasTeamSubscription: true })
      )
    ).toBeNull();
  });
});
