import { describe, expect, it } from "vitest";
import {
  canCommitOwnershipTransferAcceptance,
  ownershipTransferRequiresBillingHandoff,
} from "@/shared/lib/membership/workspace-ownership-transfer";

describe("ownershipTransferRequiresBillingHandoff", () => {
  it("requires billing handoff when paid workspace billing owner differs from recipient", () => {
    expect(
      ownershipTransferRequiresBillingHandoff({
        hasTeamSubscription: true,
        fromUserId: "owner",
        toUserId: "recipient",
        billingOwnerUserId: "owner",
      })
    ).toBe(true);
  });

  it("does not require billing handoff for free workspaces", () => {
    expect(
      ownershipTransferRequiresBillingHandoff({
        hasTeamSubscription: false,
        fromUserId: "owner",
        toUserId: "recipient",
        billingOwnerUserId: "owner",
      })
    ).toBe(false);
  });

  it("does not require billing handoff when recipient is already billing owner", () => {
    expect(
      ownershipTransferRequiresBillingHandoff({
        hasTeamSubscription: true,
        fromUserId: "owner",
        toUserId: "recipient",
        billingOwnerUserId: "recipient",
      })
    ).toBe(false);
  });
});

describe("canCommitOwnershipTransferAcceptance", () => {
  const expiresAt = new Date("2026-06-01T00:00:00.000Z");

  it("blocks acceptance when billing setup is still required", () => {
    expect(
      canCommitOwnershipTransferAcceptance({
        status: "pending",
        expiresAt,
        now: new Date("2026-05-01T00:00:00.000Z"),
        requiresBillingAcceptance: true,
        stripeBillingReady: false,
      })
    ).toEqual({ ok: false, code: "billing_setup_required" });
  });

  it("allows acceptance when billing is ready", () => {
    expect(
      canCommitOwnershipTransferAcceptance({
        status: "pending",
        expiresAt,
        now: new Date("2026-05-01T00:00:00.000Z"),
        requiresBillingAcceptance: true,
        stripeBillingReady: true,
      })
    ).toEqual({ ok: true });
  });

  it("rejects expired pending transfers", () => {
    expect(
      canCommitOwnershipTransferAcceptance({
        status: "pending",
        expiresAt,
        now: new Date("2026-06-02T00:00:00.000Z"),
        requiresBillingAcceptance: false,
        stripeBillingReady: true,
      })
    ).toEqual({ ok: false, code: "expired" });
  });

  it("rejects non-pending transfers", () => {
    expect(
      canCommitOwnershipTransferAcceptance({
        status: "declined",
        expiresAt,
        now: new Date("2026-05-01T00:00:00.000Z"),
        requiresBillingAcceptance: false,
        stripeBillingReady: true,
      })
    ).toEqual({ ok: false, code: "not_pending" });
  });
});
