import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/marketing/flint-beta-group-request", () => ({
  submitFlintBetaGroupRequest: vi.fn(),
}));

import { submitFlintBetaGroupRequest } from "@/server/marketing/flint-beta-group-request";
import { POST } from "./route";

describe("POST /api/marketing/flint/beta-group-request", () => {
  beforeEach(() => {
    vi.mocked(submitFlintBetaGroupRequest).mockReset();
  });

  it("returns created outcome", async () => {
    vi.mocked(submitFlintBetaGroupRequest).mockResolvedValue("created");

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", firstName: "Ada" }),
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, outcome: "created" });
    expect(submitFlintBetaGroupRequest).toHaveBeenCalledWith({
      email: "test@example.com",
      firstName: "Ada",
      lastName: undefined,
    });
  });

  it("returns invalid_email for bad input", async () => {
    vi.mocked(submitFlintBetaGroupRequest).mockRejectedValue(new Error("invalid_email"));

    const res = await POST(
      new Request("http://localhost/api/marketing/flint/beta-group-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_email" });
  });
});
