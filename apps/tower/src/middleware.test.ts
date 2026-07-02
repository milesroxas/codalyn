import { getSessionCookie } from "better-auth/cookies";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetTowerHostConfigCacheForTests } from "@/server/tower-hosts";
import { middleware } from "./middleware";

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: vi.fn(() => null),
}));

const ENV_KEYS = ["TOWER_HOST_SPLIT", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL", "TOWER_APP_HOST"] as const;

function makeRequest(host: string, pathname: string): NextRequest {
  const url = new URL(pathname, `https://${host}`);
  return new NextRequest(url, { headers: { host } });
}

afterEach(() => {
  vi.mocked(getSessionCookie).mockReturnValue(null);
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  resetTowerHostConfigCacheForTests();
});

describe("middleware host split", () => {
  it("does not redirect logged-out app host / in middleware", () => {
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("tower-preview.codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
  });

  it("allows marketing host / when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
  });

  it("allows marketing host /beacon when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/beacon"));
    expect(response?.status).not.toBe(307);
  });

  it("allows marketing host /tower when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/tower"));
    expect(response?.status).not.toBe(307);
  });

  it("allows marketing host /flint when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/flint"));
    expect(response?.status).not.toBe(307);
  });

  it("allows marketing host /support when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/support"));
    expect(response?.status).not.toBe(307);
  });

  it("allows logged-out access to /support on the app host", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(makeRequest("tower.codalyn.app", "/support"));
    expect(response?.status).not.toBe(307);
  });

  it("rewrites flint marketing host / to the flint landing page", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("flint-preview.codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
    expect(response?.headers.get("x-middleware-rewrite")).toBe("https://flint-preview.codalyn.app/flint");
  });

  it("redirects marketing host protected routes to the app host", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/account"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://tower-preview.codalyn.app/account");
  });

  it("redirects signed-in preview marketing host / to auth continue on the app host", () => {
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    vi.mocked(getSessionCookie).mockReturnValue("session-token");
    const response = middleware(makeRequest("preview.codalyn.app", "/"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://tower-preview.codalyn.app/auth/continue");
  });

  it("does not redirect app host / when a session cookie is present", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    vi.mocked(getSessionCookie).mockReturnValue("session-token");
    const response = middleware(makeRequest("tower.codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
  });

  it("passes Better Auth verify-email API requests through middleware", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(
      makeRequest(
        "tower.codalyn.app",
        "/api/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Ftower.codalyn.app%2F"
      )
    );
    expect(response?.status).not.toBe(307);
  });

  it("allows logged-out access to the first-party verify-email page", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(
      makeRequest("tower.codalyn.app", "/verify-email?token=abc&callbackURL=https%3A%2F%2Ftower.codalyn.app%2F")
    );
    expect(response?.status).not.toBe(307);
  });

  it("redirects marketing host verify-email links to the app host with query preserved", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/verify-email?token=abc&callbackURL=%2F"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://tower.codalyn.app/verify-email?token=abc&callbackURL=%2F");
  });

  it("redirects marketing host verify API links to the app host with query preserved", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(
      makeRequest("codalyn.app", "/api/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Ftower.codalyn.app%2F")
    );
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://tower.codalyn.app/api/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Ftower.codalyn.app%2F"
    );
  });

  it("still redirects protected routes to sign-in when logged out", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    const response = middleware(makeRequest("tower.codalyn.app", "/account"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://tower.codalyn.app/sign-in?callbackUrl=%2Faccount");
  });

  it("returns CORS headers for OPTIONS /api/auth from Webflow extension origins", () => {
    const url = new URL("/api/auth/get-session", "https://tower.codalyn.app");
    const request = new NextRequest(url, {
      method: "OPTIONS",
      headers: {
        host: "tower.codalyn.app",
        Origin: "https://69e3aaad66cf6f468fd8ecb8.webflow-ext.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    const response = middleware(request);
    expect(response?.status).toBe(204);
    expect(response?.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://69e3aaad66cf6f468fd8ecb8.webflow-ext.com"
    );
    expect(response?.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});
