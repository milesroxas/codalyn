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
  it("redirects logged-out app host / to /sign-in", () => {
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("tower-preview.codalyn.app", "/"));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("https://tower-preview.codalyn.app/sign-in");
  });

  it("allows marketing host / when logged out", () => {
    process.env.TOWER_HOST_SPLIT = "1";
    process.env.BETTER_AUTH_URL = "https://tower-preview.codalyn.app";
    const response = middleware(makeRequest("codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
  });

  it("does not redirect app host / when a session cookie is present", () => {
    process.env.BETTER_AUTH_URL = "https://tower.codalyn.app";
    vi.mocked(getSessionCookie).mockReturnValue("session-token");
    const response = middleware(makeRequest("tower.codalyn.app", "/"));
    expect(response?.status).not.toBe(307);
  });
});
