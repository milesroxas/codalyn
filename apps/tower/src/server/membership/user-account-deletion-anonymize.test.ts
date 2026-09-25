import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
  dbDelete: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: { select: mocks.dbSelect, update: mocks.dbUpdate, delete: mocks.dbDelete },
}));
vi.mock("@/server/billing/organization-billing", () => ({ isOrganizationTeamEntitled: vi.fn() }));
vi.mock("@/server/billing/stripe-org-seat-sync", () => ({ syncOrganizationSeatQuantityWithStripe: vi.fn() }));
vi.mock("@/server/membership/invitation-hygiene", () => ({ cancelPendingInvitationsForEmail: vi.fn() }));

import { anonymizePersonalDataForDeletedAccount } from "@/server/membership/user-account-deletion";

function updateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set, where };
}

function deleteChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  return { where };
}

function toSql(chain: { where: ReturnType<typeof vi.fn> }): string {
  const condition = chain.where.mock.calls[0]?.[0] as SQL | undefined;
  return condition ? new PgDialect().sqlToQuery(condition).sql : "";
}

function setSql(chain: ReturnType<typeof updateChain>): string {
  const values = chain.set.mock.calls[0]?.[0] as { email: SQL };
  return new PgDialect().sqlToQuery(values.email).sql;
}

describe("anonymizePersonalDataForDeletedAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes access requests and replaces the address on support, redemption and non-pending invitation rows with a per-row placeholder", async () => {
    const earlyAccess = deleteChain();
    const flintBeta = deleteChain();
    const support = updateChain();
    const redemption = updateChain();
    const invitations = updateChain();
    mocks.dbDelete.mockReturnValueOnce(earlyAccess).mockReturnValueOnce(flintBeta);
    mocks.dbUpdate.mockReturnValueOnce(support).mockReturnValueOnce(redemption).mockReturnValueOnce(invitations);

    await anonymizePersonalDataForDeletedAccount("user-1", "  Person@Example.com ");

    expect(toSql(earlyAccess)).toContain('lower("early_access_request"."email") = $1');
    expect(toSql(flintBeta)).toContain('lower("flint_beta_group_request"."email") = $1');

    expect(setSql(support)).toContain(`'deleted-' || "support_request"."id" || '@deleted.invalid'`);
    expect(toSql(support)).toContain('"support_request"."user_id" = $1');
    expect(toSql(support)).toContain('lower("support_request"."email") = $2');

    expect(setSql(redemption)).toContain(
      `'deleted-' || left("tower_operator_invite_redemption"."token_hash", 16) || '@deleted.invalid'`
    );
    expect(setSql(invitations)).toContain(`'deleted-' || "invitation"."id" || '@deleted.invalid'`);
    expect(toSql(invitations)).toContain('"invitation"."status" <> $2');
  });

  it("does nothing for a blank address", async () => {
    await anonymizePersonalDataForDeletedAccount("user-1", "   ");
    expect(mocks.dbDelete).not.toHaveBeenCalled();
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});
