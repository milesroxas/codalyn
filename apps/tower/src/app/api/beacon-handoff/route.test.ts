import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      verifyOneTimeToken: vi.fn(),
    },
  },
}));

import { auth } from "@/server/auth";
import { POST } from "./route";

const ORIGIN = "https://tower.codalyn.app";

function makeRequest(options: { origin?: string | null; contentType?: string | null; body?: string }): Request {
  const headers = new Headers();
  if (options.origin != null) {
    headers.set("origin", options.origin);
  }
  if (options.contentType != null) {
    headers.set("content-type", options.contentType);
  }
  return new Request(`${ORIGIN}/api/beacon-handoff`, {
    method: "POST",
    headers,
    body: options.body ?? "",
  });
}

describe("POST /api/beacon-handoff", () => {
  beforeEach(() => {
    vi.mocked(auth.api.verifyOneTimeToken).mockReset();
  });

  it("redeems a JSON-body token from a same-origin request", async () => {
    const res = await POST(
      makeRequest({ origin: ORIGIN, contentType: "application/json", body: JSON.stringify({ token: "tok-1" }) })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(auth.api.verifyOneTimeToken).toHaveBeenCalledWith(expect.objectContaining({ body: { token: "tok-1" } }));
  });

  it("rejects a cross-origin request before touching the token (login-CSRF guard)", async () => {
    const res = await POST(
      makeRequest({
        origin: "https://evil.example",
        contentType: "application/json",
        body: JSON.stringify({ token: "tok-1" }),
      })
    );

    expect(res.status).toBe(403);
    expect(auth.api.verifyOneTimeToken).not.toHaveBeenCalled();
  });

  it("rejects a request with no Origin header", async () => {
    const res = await POST(
      makeRequest({ origin: null, contentType: "application/json", body: JSON.stringify({ token: "tok-1" }) })
    );

    expect(res.status).toBe(403);
    expect(auth.api.verifyOneTimeToken).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON content type (blocks form-encoded cross-site posts)", async () => {
    const res = await POST(makeRequest({ origin: ORIGIN, contentType: "text/plain", body: '{"token":"tok-1"}' }));

    expect(res.status).toBe(415);
    expect(auth.api.verifyOneTimeToken).not.toHaveBeenCalled();
  });

  it("treats malformed JSON, missing token, and non-string token as no token (no redemption attempt)", async () => {
    for (const body of ["not json", "{}", JSON.stringify({ token: 42 }), JSON.stringify({ token: "   " })]) {
      const res = await POST(makeRequest({ origin: ORIGIN, contentType: "application/json", body }));
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
    }
    expect(auth.api.verifyOneTimeToken).not.toHaveBeenCalled();
  });

  it("returns the same ok response when redemption fails (no token-validity oracle)", async () => {
    vi.mocked(auth.api.verifyOneTimeToken).mockRejectedValue(new Error("expired"));

    const res = await POST(
      makeRequest({ origin: ORIGIN, contentType: "application/json", body: JSON.stringify({ token: "used" }) })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
