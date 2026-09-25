import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "./sentry-scrub";

describe("scrubSentryEvent", () => {
  it("drops the Tower bearer, cookies and the request body while keeping harmless headers", () => {
    const event = {
      message: "boom",
      request: {
        url: "https://tower.codalyn.app/api/v2/webflow/sites/abc/pages",
        headers: {
          Authorization: "Bearer tower-session-token",
          Cookie: "better-auth.session_token=abc",
          "x-api-key": "k",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cookies: { "better-auth.session_token": "abc" },
        data: { composition: [{ text: "customer content" }] },
      },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request.headers).toEqual({ "Content-Type": "application/json", Accept: "application/json" });
    expect(scrubbed.request).not.toHaveProperty("cookies");
    expect(scrubbed.request).not.toHaveProperty("data");
    expect(scrubbed.request.url).toBe("https://tower.codalyn.app/api/v2/webflow/sites/abc/pages");
    expect(scrubbed.message).toBe("boom");
  });

  it("matches header names case-insensitively", () => {
    const scrubbed = scrubSentryEvent({
      request: { headers: { AUTHORIZATION: "Bearer x", authorization: "Bearer y" } },
    });
    expect(scrubbed.request?.headers).toEqual({});
  });

  it("returns events without a request context untouched", () => {
    const event = { message: "no request", request: undefined };
    expect(scrubSentryEvent(event)).toBe(event);
  });
});
