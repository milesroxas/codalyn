import { describe, expect, it } from "vitest";

import { earlyAccessSubmitErrorMessage, normalizeEarlyAccessSubmitResponse } from "./early-access-request";

describe("normalizeEarlyAccessSubmitResponse", () => {
  it("reads the canonical success shape", () => {
    expect(normalizeEarlyAccessSubmitResponse({ ok: true, outcome: "created" })).toEqual({
      outcome: "created",
      error: null,
    });
    expect(normalizeEarlyAccessSubmitResponse({ ok: true, outcome: "already_pending" })).toEqual({
      outcome: "already_pending",
      error: null,
    });
    expect(normalizeEarlyAccessSubmitResponse({ ok: true, outcome: "already_has_access" })).toEqual({
      outcome: "already_has_access",
      error: null,
    });
  });

  it("reads the canonical error shape", () => {
    expect(normalizeEarlyAccessSubmitResponse({ error: "invalid_email" })).toEqual({
      outcome: null,
      error: "invalid_email",
    });
  });

  it("accepts the wrapped `{ value }` form", () => {
    expect(normalizeEarlyAccessSubmitResponse({ outcome: { value: "created" } })).toEqual({
      outcome: "created",
      error: null,
    });
    expect(normalizeEarlyAccessSubmitResponse({ error: { value: "invalid_referral" } })).toEqual({
      outcome: null,
      error: "invalid_referral",
    });
  });

  it("normalizes missing fields to nulls", () => {
    expect(normalizeEarlyAccessSubmitResponse({})).toEqual({ outcome: null, error: null });
    expect(normalizeEarlyAccessSubmitResponse(null)).toEqual({ outcome: null, error: null });
    expect(normalizeEarlyAccessSubmitResponse(undefined)).toEqual({ outcome: null, error: null });
  });

  it("normalizes malformed fields to nulls", () => {
    expect(normalizeEarlyAccessSubmitResponse({ outcome: "approved_maybe" })).toEqual({ outcome: null, error: null });
    expect(normalizeEarlyAccessSubmitResponse({ outcome: 1, error: 400 })).toEqual({ outcome: null, error: null });
    expect(normalizeEarlyAccessSubmitResponse("created")).toEqual({ outcome: null, error: null });
  });
});

describe("earlyAccessSubmitErrorMessage", () => {
  it("maps known server error codes", () => {
    expect(earlyAccessSubmitErrorMessage("invalid_email")).toMatch(/valid email/i);
    expect(earlyAccessSubmitErrorMessage("invalid_referral")).toMatch(/heard about/i);
    expect(earlyAccessSubmitErrorMessage("invalid_referral_other")).toMatch(/where you heard/i);
    expect(earlyAccessSubmitErrorMessage("not_available")).toMatch(/not taking requests/i);
  });

  it("falls back to the generic message for unknown or missing codes", () => {
    expect(earlyAccessSubmitErrorMessage("mystery_code")).toMatch(/could not send/i);
    expect(earlyAccessSubmitErrorMessage(null)).toMatch(/could not send/i);
  });
});
