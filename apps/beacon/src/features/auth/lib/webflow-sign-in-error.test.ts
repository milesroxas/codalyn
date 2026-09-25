import { describe, expect, it } from "vitest";
import { messageForWebflowSignInError } from "./webflow-sign-in-error";

describe("messageForWebflowSignInError", () => {
  it("maps the access gate to a request-access hint", () => {
    expect(messageForWebflowSignInError("early_access_required")).toMatch(/Request access/);
  });

  it("groups every operator-side resolve failure under one message", () => {
    const codes = [
      "webflow_resolve_bearer_missing",
      "webflow_resolve_bearer_invalid",
      "webflow_resolve_scope_missing",
      "webflow_resolve_upstream_error",
    ];
    const messages = new Set(codes.map(messageForWebflowSignInError));
    expect(messages.size).toBe(1);
    expect([...messages][0]).toMatch(/can't verify Webflow sign-ins/);
  });

  it("tolerates whitespace around a known code and falls back for unknown ones", () => {
    expect(messageForWebflowSignInError(" rate_limited ")).toMatch(/Too many/);
    expect(messageForWebflowSignInError("http_500")).toMatch(/Try again/);
    expect(messageForWebflowSignInError("")).toMatch(/Try again/);
  });
});
