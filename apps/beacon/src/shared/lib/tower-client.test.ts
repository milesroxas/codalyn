import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/lib/webflow-designer-session", () => ({
  readBeaconTowerSessionToken: () => "test-session-token",
}));
vi.mock("@/shared/lib/beacon-tower-origin", () => ({
  readBeaconTowerOrigin: () => "https://tower.test",
}));

import { towerFetchWithRetry } from "./tower-client";

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("towerFetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns immediately on a non-429 response without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(404));
    vi.stubGlobal("fetch", fetchMock);

    const res = await towerFetchWithRetry("/api/v2/webflow/pages/p1/custom_code");

    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 then succeeds, honoring numeric Retry-After seconds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(429, { "Retry-After": "2" }))
      .mockResolvedValueOnce(response(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = towerFetchWithRetry("/api/v2/webflow/pages/p1/custom_code");
    await vi.advanceTimersByTimeAsync(2000);
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retry cap and returns the last 429", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(429));
    vi.stubGlobal("fetch", fetchMock);

    const promise = towerFetchWithRetry("/api/v2/webflow/pages/p1/custom_code");
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(429);
    // initial attempt + 4 retries
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
