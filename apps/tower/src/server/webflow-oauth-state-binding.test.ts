import { describe, expect, it } from "vitest";
import {
  isWebflowOAuthApproverBound,
  isWebflowOAuthStateExpired,
  validateWebflowOAuthStateRow,
  WEBFLOW_OAUTH_STATE_TTL_MS,
} from "./webflow-oauth-state-binding";

const now = new Date("2026-08-18T12:00:00Z");
const row = {
  userId: "u1",
  organizationId: "org1",
  appKey: "beacon",
  webflowAuthorizedUserId: "wf_user_1",
  createdAt: new Date(now.getTime() - 60_000),
};

describe("isWebflowOAuthStateExpired", () => {
  it("is fresh inside the TTL and expired past it", () => {
    expect(isWebflowOAuthStateExpired(new Date(now.getTime() - WEBFLOW_OAUTH_STATE_TTL_MS + 1), now)).toBe(false);
    expect(isWebflowOAuthStateExpired(new Date(now.getTime() - WEBFLOW_OAUTH_STATE_TTL_MS - 1), now)).toBe(true);
  });

  it("treats a future or invalid createdAt as expired", () => {
    expect(isWebflowOAuthStateExpired(new Date(now.getTime() + 5_000), now)).toBe(true);
    expect(isWebflowOAuthStateExpired(new Date(Number.NaN), now)).toBe(true);
  });
});

describe("validateWebflowOAuthStateRow", () => {
  it("accepts a fresh, bound row", () => {
    const result = validateWebflowOAuthStateRow(row, now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.webflowAuthorizedUserId).toBe("wf_user_1");
    }
  });

  it("rejects a missing row", () => {
    expect(validateWebflowOAuthStateRow(null, now)).toEqual({ ok: false, error: "invalid_state" });
    expect(validateWebflowOAuthStateRow(undefined, now)).toEqual({ ok: false, error: "invalid_state" });
  });

  it("rejects legacy rows with no bound Webflow user (null, empty, whitespace)", () => {
    for (const bound of [null, "", "   "]) {
      expect(validateWebflowOAuthStateRow({ ...row, webflowAuthorizedUserId: bound }, now)).toEqual({
        ok: false,
        error: "invalid_state",
      });
    }
  });

  it("rejects rows past the TTL", () => {
    const stale = { ...row, createdAt: new Date(now.getTime() - WEBFLOW_OAUTH_STATE_TTL_MS - 1) };
    expect(validateWebflowOAuthStateRow(stale, now)).toEqual({ ok: false, error: "state_expired" });
  });
});

describe("isWebflowOAuthApproverBound", () => {
  it("matches only the exact minter id", () => {
    expect(isWebflowOAuthApproverBound("wf_user_1", "wf_user_1")).toBe(true);
    expect(isWebflowOAuthApproverBound("wf_user_1", "wf_user_2")).toBe(false);
  });

  it("never matches an unknown identity", () => {
    expect(isWebflowOAuthApproverBound("wf_user_1", null)).toBe(false);
    expect(isWebflowOAuthApproverBound("wf_user_1", "")).toBe(false);
    expect(isWebflowOAuthApproverBound("", "")).toBe(false);
  });
});
