import { describe, expect, it } from "vitest";
import { computePurgeScheduledAt } from "@/server/membership/workspace-deletion-preview";
import {
  computeAccountDeletionBlockers,
  formatAccountDeletionBlockedMessage,
  resolveSharedMembershipOrganizationIds,
  WORKSPACE_SOFT_DELETE_RECOVERY_DAYS,
} from "@/shared/lib/membership/workspace-ownership";

const userId = "user-1";

describe("computeAccountDeletionBlockers", () => {
  it("allows deletion when user has no ownership or billing responsibilities", () => {
    expect(
      computeAccountDeletionBlockers(userId, [
        {
          organizationId: "org-1",
          organizationName: "Acme",
          organizationSlug: "acme",
          ownerUserId: "user-2",
          billingOwnerUserId: null,
          hasTeamSubscription: false,
          memberCount: 2,
          deletedAt: null,
        },
      ])
    ).toEqual([]);
  });

  it("blocks deletion when user owns a soft-deleted workspace", () => {
    const blockers = computeAccountDeletionBlockers(userId, [
      {
        organizationId: "org-1",
        organizationName: "Solo",
        organizationSlug: "solo",
        ownerUserId: userId,
        billingOwnerUserId: null,
        hasTeamSubscription: false,
        memberCount: 1,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    expect(blockers[0]?.reason).toBe("workspace_pending_deletion");
  });

  it("blocks deletion when user owns a shared workspace", () => {
    const blockers = computeAccountDeletionBlockers(userId, [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        ownerUserId: userId,
        billingOwnerUserId: userId,
        hasTeamSubscription: true,
        memberCount: 3,
        deletedAt: null,
      },
    ]);

    expect(blockers).toEqual([
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        reason: "workspace_owner",
        memberCount: 3,
        otherMemberCount: 2,
        hasTeamSubscription: true,
      },
    ]);
  });

  it("blocks deletion when user owns a sole-member workspace", () => {
    const blockers = computeAccountDeletionBlockers(userId, [
      {
        organizationId: "org-1",
        organizationName: "Solo",
        organizationSlug: "solo",
        ownerUserId: userId,
        billingOwnerUserId: null,
        hasTeamSubscription: false,
        memberCount: 1,
        deletedAt: null,
      },
    ]);

    expect(blockers[0]?.reason).toBe("sole_owner_workspace");
  });

  it("blocks deletion when user is billing owner of a paid workspace", () => {
    const blockers = computeAccountDeletionBlockers(userId, [
      {
        organizationId: "org-1",
        organizationName: "Acme",
        organizationSlug: "acme",
        ownerUserId: "user-2",
        billingOwnerUserId: userId,
        hasTeamSubscription: true,
        memberCount: 2,
        deletedAt: null,
      },
    ]);

    expect(blockers).toEqual([expect.objectContaining({ reason: "billing_owner", organizationId: "org-1" })]);
  });
});

describe("resolveSharedMembershipOrganizationIds", () => {
  it("excludes owned workspaces from membership release", () => {
    expect(
      resolveSharedMembershipOrganizationIds([{ organizationId: "owned" }, { organizationId: "shared" }], ["owned"])
    ).toEqual(["shared"]);
  });
});

describe("formatAccountDeletionBlockedMessage", () => {
  it("mentions transfer or delete for shared workspace owners", () => {
    expect(
      formatAccountDeletionBlockedMessage([
        {
          organizationId: "org-1",
          organizationName: "Acme",
          organizationSlug: "acme",
          reason: "workspace_owner",
          memberCount: 2,
          otherMemberCount: 1,
          hasTeamSubscription: false,
        },
      ])
    ).toContain("Transfer workspace ownership");
  });

  it("mentions billing transfer for billing owners", () => {
    expect(
      formatAccountDeletionBlockedMessage([
        {
          organizationId: "org-1",
          organizationName: "Acme",
          organizationSlug: "acme",
          reason: "billing_owner",
          memberCount: 2,
          otherMemberCount: 1,
          hasTeamSubscription: true,
        },
      ])
    ).toContain("billing ownership");
  });

  it("mentions recovery window for workspaces pending deletion", () => {
    expect(
      formatAccountDeletionBlockedMessage([
        {
          organizationId: "org-1",
          organizationName: "Solo",
          organizationSlug: "solo",
          reason: "workspace_pending_deletion",
          memberCount: 1,
          otherMemberCount: 0,
          hasTeamSubscription: false,
        },
      ])
    ).toContain(String(WORKSPACE_SOFT_DELETE_RECOVERY_DAYS));
  });
});

describe("computePurgeScheduledAt", () => {
  it("schedules purge after the configured recovery window", () => {
    const deletedAt = new Date("2026-01-01T00:00:00.000Z");
    const purgeAt = computePurgeScheduledAt(deletedAt);
    expect(purgeAt.getUTCDate()).toBe(1 + WORKSPACE_SOFT_DELETE_RECOVERY_DAYS);
  });
});
