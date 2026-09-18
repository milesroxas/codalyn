import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
}));

vi.mock("@/shared/lib/db", () => ({
  db: {
    select: mocks.dbSelect,
    update: mocks.dbUpdate,
  },
}));

import { resolveActiveOrganizationId } from "@/server/resolve-active-organization-id";

type QueryChain = {
  from: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (resolve: (rows: unknown[]) => unknown, reject: (err: unknown) => unknown) => unknown;
};

/** One select chain; `.limit()` resolves rows, and the chain itself is awaitable (join query ends at `.orderBy()`). */
function queryChain(rows: unknown[]): QueryChain {
  const chain = {} as QueryChain;
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(rows);
  // biome-ignore lint/suspicious/noThenProperty: drizzle query builders are thenable; the join query is awaited directly after `.orderBy()`.
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  return chain;
}

function enqueueSelects(...chains: QueryChain[]) {
  for (const chain of chains) {
    mocks.dbSelect.mockReturnValueOnce(chain);
  }
}

function mockUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mocks.dbUpdate.mockReturnValue({ set });
  return { set, where };
}

function renderWhereSql(chain: QueryChain): string {
  const condition = chain.where.mock.calls[0]?.[0] as SQL | undefined;
  if (!condition) {
    return "";
  }
  return new PgDialect().sqlToQuery(condition).sql;
}

describe("resolveActiveOrganizationId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session's own active organization when it is alive", async () => {
    enqueueSelects(queryChain([{ activeOrganizationId: "org-own" }]), queryChain([{ id: "org-own" }]));

    const result = await resolveActiveOrganizationId("user-own", "sess-own");

    expect(result).toBe("org-own");
    expect(mocks.dbSelect).toHaveBeenCalledTimes(2);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("inherits the most recent session that holds a workspace when the current session has none", async () => {
    // A freshly minted Designer session (null org) must not shadow the Tower browser
    // session the user opened the Designer from.
    const recentSessions = queryChain([{ activeOrganizationId: "org-invited" }]);
    enqueueSelects(queryChain([{ activeOrganizationId: null }]), recentSessions, queryChain([{ id: "org-invited" }]));

    const result = await resolveActiveOrganizationId("user-designer", "sess-designer");

    expect(result).toBe("org-invited");
    expect(renderWhereSql(recentSessions)).toContain('"active_organization_id" is not null');
    expect(mocks.dbSelect).toHaveBeenCalledTimes(3);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("skips a recent session pointing at a deleted organization and falls back to memberships", async () => {
    enqueueSelects(
      queryChain([{ activeOrganizationId: null }]),
      queryChain([{ activeOrganizationId: "org-dead" }]),
      queryChain([]),
      queryChain([{ preferredOrganizationId: null }]),
      queryChain([
        { id: "org-a", name: "Alpha" },
        { id: "org-b", name: "Beta" },
      ])
    );
    const update = mockUpdateChain();

    const result = await resolveActiveOrganizationId("user-dead-org", "sess-dead-org");

    expect(result).toBe("org-a");
    expect(update.set).toHaveBeenCalledWith({ activeOrganizationId: "org-a" });
  });

  it("prefers the user's preferred organization in the membership fallback", async () => {
    enqueueSelects(
      queryChain([{ activeOrganizationId: null }]),
      queryChain([]),
      queryChain([{ preferredOrganizationId: "org-b" }]),
      queryChain([
        { id: "org-a", name: "Alpha" },
        { id: "org-b", name: "Beta" },
      ])
    );
    const update = mockUpdateChain();

    const result = await resolveActiveOrganizationId("user-preferred", "sess-preferred");

    expect(result).toBe("org-b");
    expect(update.set).toHaveBeenCalledWith({ activeOrganizationId: "org-b" });
  });

  it("returns null when the user has no sessions with a workspace and no memberships", async () => {
    enqueueSelects(
      queryChain([{ activeOrganizationId: null }]),
      queryChain([]),
      queryChain([{ preferredOrganizationId: null }]),
      queryChain([])
    );

    const result = await resolveActiveOrganizationId("user-empty", "sess-empty");

    expect(result).toBeNull();
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});

describe('resolveActiveOrganizationId with fallback "none" (Designer Extension sessions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and never writes when no live session holds a workspace, even though memberships exist", async () => {
    // Review round 8: the extension holds a single-workspace default locally and persists it only on
    // the user's confirmation — the server must neither pick a membership nor write it to the session.
    enqueueSelects(queryChain([{ activeOrganizationId: null }]), queryChain([]));

    const result = await resolveActiveOrganizationId("user-ext-none", "sess-ext-none", "none");

    expect(result).toBeNull();
    // Only the session read and the live-session read ran: no preferred-org / membership queries.
    expect(mocks.dbSelect).toHaveBeenCalledTimes(2);
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("still returns the session's own workspace", async () => {
    enqueueSelects(queryChain([{ activeOrganizationId: "org-chosen" }]), queryChain([{ id: "org-chosen" }]));

    const result = await resolveActiveOrganizationId("user-ext-own", "sess-ext-own", "none");

    expect(result).toBe("org-chosen");
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });

  it("still inherits a workspace the user holds on another live session, without writing", async () => {
    enqueueSelects(
      queryChain([{ activeOrganizationId: null }]),
      queryChain([{ activeOrganizationId: "org-web" }]),
      queryChain([{ id: "org-web" }])
    );

    const result = await resolveActiveOrganizationId("user-ext-inherit", "sess-ext-inherit", "none");

    expect(result).toBe("org-web");
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});
