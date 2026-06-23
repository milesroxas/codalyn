import { beforeEach, describe, expect, it, vi } from "vitest";

const syncOrganizationSeatQuantityWithStripe = vi.fn();

// Chainable drizzle stub: builder methods return the builder; `where` terminates every chain and
// resolves to `selectResult`. `update`/`delete` results are ignored by the code under test.
let selectResult: Array<{ organizationId: string }> = [];
const builder: Record<string, ReturnType<typeof vi.fn>> = {};
for (const method of ["select", "from", "set", "update", "delete", "limit"]) {
  builder[method] = vi.fn(() => builder);
}
builder.where = vi.fn(() => Promise.resolve(selectResult));

vi.mock("@/shared/lib/db", () => ({ db: builder }));
vi.mock("@/server/billing/stripe-org-seat-sync", () => ({ syncOrganizationSeatQuantityWithStripe }));

describe("cancelPendingInvitationsForEmail", () => {
  beforeEach(() => {
    selectResult = [];
    for (const method of ["select", "from", "where", "set", "update", "delete", "limit"]) {
      builder[method].mockClear();
    }
    syncOrganizationSeatQuantityWithStripe.mockReset();
  });

  it("ignores blank email without touching the database", async () => {
    const { cancelPendingInvitationsForEmail } = await import("@/server/membership/invitation-hygiene");
    await cancelPendingInvitationsForEmail("   ");
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.update).not.toHaveBeenCalled();
    expect(syncOrganizationSeatQuantityWithStripe).not.toHaveBeenCalled();
  });

  it("short-circuits when no pending invitations match", async () => {
    selectResult = [];
    const { cancelPendingInvitationsForEmail } = await import("@/server/membership/invitation-hygiene");
    await cancelPendingInvitationsForEmail("Gone@Example.com");
    expect(builder.select).toHaveBeenCalledTimes(1);
    expect(builder.update).not.toHaveBeenCalled();
    expect(syncOrganizationSeatQuantityWithStripe).not.toHaveBeenCalled();
  });

  it("cancels pending invites and resyncs each affected workspace once", async () => {
    selectResult = [{ organizationId: "org_a" }, { organizationId: "org_a" }, { organizationId: "org_b" }];
    const { cancelPendingInvitationsForEmail } = await import("@/server/membership/invitation-hygiene");
    await cancelPendingInvitationsForEmail("gone@example.com");
    expect(builder.update).toHaveBeenCalledTimes(1);
    expect(syncOrganizationSeatQuantityWithStripe).toHaveBeenCalledTimes(2);
    expect(syncOrganizationSeatQuantityWithStripe).toHaveBeenCalledWith("org_a");
    expect(syncOrganizationSeatQuantityWithStripe).toHaveBeenCalledWith("org_b");
  });
});

describe("clearAccountDeletedInvitationGhosts", () => {
  beforeEach(() => {
    selectResult = [];
    for (const method of ["select", "from", "where", "set", "update", "delete", "limit"]) {
      builder[method].mockClear();
    }
    syncOrganizationSeatQuantityWithStripe.mockReset();
  });

  it("ignores blank email without deleting", async () => {
    const { clearAccountDeletedInvitationGhosts } = await import("@/server/membership/invitation-hygiene");
    await clearAccountDeletedInvitationGhosts({ organizationId: "org_a", email: "  " });
    expect(builder.delete).not.toHaveBeenCalled();
  });

  it("deletes account_deleted ghost rows for the email", async () => {
    const { clearAccountDeletedInvitationGhosts } = await import("@/server/membership/invitation-hygiene");
    await clearAccountDeletedInvitationGhosts({
      organizationId: "org_a",
      email: "Rejoin@Example.com",
      exceptInvitationId: "inv_new",
    });
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.where).toHaveBeenCalled();
  });
});
