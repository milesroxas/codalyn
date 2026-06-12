import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyTowerApiRequest, getSession, submitSupportRequest } = vi.hoisted(() => ({
  verifyTowerApiRequest: vi.fn(),
  getSession: vi.fn(),
  submitSupportRequest: vi.fn(),
}));

vi.mock("@/server/tower-api-auth", () => ({
  verifyTowerApiRequest,
}));

vi.mock("@/server/auth", () => ({
  auth: {
    api: {
      getSession,
    },
  },
}));

vi.mock("@/server/support/support-request", () => ({
  submitSupportRequest,
}));

import { POST } from "./route";

describe("POST /api/v1/beacon/support-request", () => {
  beforeEach(() => {
    verifyTowerApiRequest.mockReset();
    getSession.mockReset();
    submitSupportRequest.mockReset();
    submitSupportRequest.mockResolvedValue({ id: "req-1" });
  });

  it("accepts guest submissions with email in the body", async () => {
    verifyTowerApiRequest.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(
      new Request("http://localhost/api/v1/beacon/support-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "help",
          topic: "beacon",
          details: "Need help with slots",
          email: "guest@example.com",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(submitSupportRequest).toHaveBeenCalledWith({
      kind: "help",
      topic: "beacon",
      details: "Need help with slots",
      email: "guest@example.com",
      userId: null,
    });
  });

  it("rejects guest submissions without a valid email", async () => {
    verifyTowerApiRequest.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(
      new Request("http://localhost/api/v1/beacon/support-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          topic: "general",
          details: "Looks great",
          email: "not-an-email",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("invalid_email");
    expect(submitSupportRequest).not.toHaveBeenCalled();
  });

  it("uses the signed-in session email and ignores body email", async () => {
    verifyTowerApiRequest.mockResolvedValue({ ok: true, userId: "user-1" });
    getSession.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com" },
    });

    const res = await POST(
      new Request("http://localhost/api/v1/beacon/support-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          topic: "general",
          details: "Nice work",
          email: "spoof@example.com",
        }),
      })
    );

    expect(res.status).toBe(200);
    expect(submitSupportRequest).toHaveBeenCalledWith({
      kind: "feedback",
      topic: "general",
      details: "Nice work",
      email: "member@example.com",
      userId: "user-1",
    });
  });
});
