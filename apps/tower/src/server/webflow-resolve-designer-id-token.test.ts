import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decideDesignerResolveFailure,
  resolveWebflowDesignerIdToken,
  type WebflowResolveBearerCandidate,
} from "@/server/webflow-resolve-designer-id-token";

const ORG_CANDIDATE: WebflowResolveBearerCandidate = { token: "t", organizationId: "org_1" };
const ENV_CANDIDATE: WebflowResolveBearerCandidate = { token: "t" };
const fail = (reason: string, status = 400) =>
  ({ ok: false, reason, status, detail: "" }) as Parameters<typeof decideDesignerResolveFailure>[0];

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const fn = vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveWebflowDesignerIdToken", () => {
  it("resolves the canonical camelCase shape", async () => {
    mockFetch(200, {
      userId: "u_1",
      email: "User@Example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      siteId: "s_1",
    });
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toEqual({
      ok: true,
      user: { id: "u_1", email: "user@example.com", firstName: "Ada", lastName: "Lovelace", siteId: "s_1" },
    });
  });

  it("accepts alternate snake_case / id field shapes", async () => {
    mockFetch(200, { id: "u_2", email: "a@b.com", first_name: "Grace", last_name: "Hopper", site_id: "s_2" });
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toEqual({
      ok: true,
      user: { id: "u_2", email: "a@b.com", firstName: "Grace", lastName: "Hopper", siteId: "s_2" },
    });
  });

  it("treats a 200 response missing id/email as malformed (does not partially apply)", async () => {
    mockFetch(200, { firstName: "NoId" });
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toEqual({ ok: false, reason: "malformed_response", status: 200, detail: "missing id/email" });
  });

  it("maps Webflow 401 to bearer_invalid (operator config)", async () => {
    mockFetch(401, "invalid token", false);
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toMatchObject({ ok: false, reason: "bearer_invalid", status: 401 });
  });

  it("maps Webflow 403 to bearer_scope_missing", async () => {
    mockFetch(403, "missing scope", false);
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toMatchObject({ ok: false, reason: "bearer_scope_missing", status: 403 });
  });

  it("maps Webflow 400 to id_token_rejected (caller token bad/expired)", async () => {
    mockFetch(400, "bad body", false);
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toMatchObject({ ok: false, reason: "id_token_rejected", status: 400 });
  });

  it("maps other non-200 to upstream_error", async () => {
    mockFetch(503, "down", false);
    const result = await resolveWebflowDesignerIdToken("idtok", "bearer");
    expect(result).toMatchObject({ ok: false, reason: "upstream_error", status: 503 });
  });
});

describe("decideDesignerResolveFailure", () => {
  it("prunes a revoked stored token and signals a transient retry when other candidates remain", () => {
    const action = decideDesignerResolveFailure(fail("bearer_invalid", 401), ORG_CANDIDATE, true);
    expect(action).toEqual({
      pruneOrganizationId: "org_1",
      response: { error: "id_token_resolve_failed", status: 401 },
    });
  });

  it("prunes a revoked stored token and returns a hard 503 when it was the last candidate", () => {
    const action = decideDesignerResolveFailure(fail("bearer_invalid", 401), ORG_CANDIDATE, false);
    expect(action.pruneOrganizationId).toBe("org_1");
    expect(action.response).toMatchObject({ error: "webflow_resolve_bearer_invalid", status: 503 });
  });

  it("does NOT prune the env bearer (no organizationId) on bearer_invalid", () => {
    const action = decideDesignerResolveFailure(fail("bearer_invalid", 401), ENV_CANDIDATE, false);
    expect(action.pruneOrganizationId).toBeUndefined();
    expect(action.response).toMatchObject({ error: "webflow_resolve_bearer_invalid", status: 503 });
  });

  it("maps bearer_scope_missing to a 503 without pruning", () => {
    const action = decideDesignerResolveFailure(fail("bearer_scope_missing", 403), ORG_CANDIDATE, true);
    expect(action.pruneOrganizationId).toBeUndefined();
    expect(action.response).toMatchObject({ error: "webflow_resolve_scope_missing", status: 503 });
  });

  it("maps upstream_error and malformed_response to 502 without pruning", () => {
    for (const reason of ["upstream_error", "malformed_response"]) {
      const action = decideDesignerResolveFailure(fail(reason, 503), ORG_CANDIDATE, true);
      expect(action.pruneOrganizationId).toBeUndefined();
      expect(action.response).toMatchObject({ error: "webflow_resolve_upstream_error", status: 502 });
    }
  });

  it("maps a rejected idToken to a retryable 401 without pruning", () => {
    const action = decideDesignerResolveFailure(fail("id_token_rejected", 400), ORG_CANDIDATE, true);
    expect(action.pruneOrganizationId).toBeUndefined();
    expect(action.response).toEqual({ error: "id_token_resolve_failed", status: 401 });
  });
});
