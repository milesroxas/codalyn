import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Configurable drizzle-chain doubles, reset per test. */
let insertReturning: (() => Promise<Array<{ tokenHash: string }>>) | (() => never);
let selectRow: Array<{ redeemedByUserId: string | null }>;

vi.mock("@/shared/lib/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: () => insertReturning(),
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => selectRow,
        }),
      }),
    }),
  },
}));

import { claimOperatorInviteToken } from "./operator-invite-single-use";

describe("claimOperatorInviteToken", () => {
  beforeEach(() => {
    insertReturning = async () => [{ tokenHash: "h" }];
    selectRow = [];
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("claims on first redemption (row inserted)", async () => {
    insertReturning = async () => [{ tokenHash: "h" }];
    expect(await claimOperatorInviteToken("tok", "user-1", "a@b.com")).toBe("claimed");
  });

  it("is idempotent for the same redeemer (conflict, same user)", async () => {
    insertReturning = async () => [];
    selectRow = [{ redeemedByUserId: "user-1" }];
    expect(await claimOperatorInviteToken("tok", "user-1", "a@b.com")).toBe("already_by_self");
  });

  it("rejects replay by a different account (conflict, other user)", async () => {
    insertReturning = async () => [];
    selectRow = [{ redeemedByUserId: "user-2" }];
    expect(await claimOperatorInviteToken("tok", "user-1", "a@b.com")).toBe("already_by_other");
  });

  it("degrades to claimed when the ledger table is missing (pre-migration)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertReturning = () => {
      const err = new Error("relation does not exist") as Error & { code: string };
      err.code = "42P01";
      throw err;
    };
    expect(await claimOperatorInviteToken("tok", "user-1", "a@b.com")).toBe("claimed");
    expect(spy).toHaveBeenCalled();
  });

  it("rethrows unexpected DB errors", async () => {
    insertReturning = () => {
      throw new Error("connection reset");
    };
    await expect(claimOperatorInviteToken("tok", "user-1", "a@b.com")).rejects.toThrow("connection reset");
  });
});
