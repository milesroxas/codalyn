import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbUpdate: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: { update: mocks.dbUpdate },
}));

import { forgetWorkspaceOnUserSessions } from "@/server/membership/forget-workspace-on-user-sessions";

function updateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set, where };
}

function whereSql(chain: ReturnType<typeof updateChain>): string {
  const condition = chain.where.mock.calls[0]?.[0] as SQL | undefined;
  return condition ? new PgDialect().sqlToQuery(condition).sql : "";
}

describe("forgetWorkspaceOnUserSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nulls the workspace pointer on the removed member's sessions and their preferred-workspace default, scoped to that user and workspace", async () => {
    const sessions = updateChain();
    const users = updateChain();
    mocks.dbUpdate.mockReturnValueOnce(sessions).mockReturnValueOnce(users);

    await forgetWorkspaceOnUserSessions("user-removed", "org-1");

    expect(sessions.set).toHaveBeenCalledWith({ activeOrganizationId: null });
    expect(whereSql(sessions)).toContain('"session"."user_id"');
    expect(whereSql(sessions)).toContain('"session"."active_organization_id"');
    expect(users.set).toHaveBeenCalledWith({ preferredOrganizationId: null });
    expect(whereSql(users)).toContain('"user"."id"');
    expect(whereSql(users)).toContain('"user"."preferred_organization_id"');
  });
});
