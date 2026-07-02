import { afterEach, describe, expect, it, vi } from "vitest";
import { postSupportRequest } from "@/features/tower-ui/lib/submit-tower-support-request";

function stubFetch(response: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function okResponse() {
  return new Response(JSON.stringify({ ok: true, id: "abc" }), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postSupportRequest", () => {
  it("posts authenticated requests to the account endpoint with no email field", async () => {
    const fetchMock = stubFetch(okResponse);

    const result = await postSupportRequest({ kind: "help", topic: "account", details: "help me" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/api/account/support-request");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ kind: "help", topic: "account", details: "help me" });
  });

  it("routes guest requests (with email) to the beacon endpoint and trims the email", async () => {
    const fetchMock = stubFetch(okResponse);

    const result = await postSupportRequest({
      kind: "feedback",
      topic: "general",
      details: "nice work",
      email: "  guest@example.com ",
    });

    expect(result).toEqual({ ok: true });
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/api/v1/beacon/support-request");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      kind: "feedback",
      topic: "general",
      details: "nice work",
      email: "guest@example.com",
    });
  });

  it("treats a blank email as authenticated (account endpoint, email omitted)", async () => {
    const fetchMock = stubFetch(okResponse);

    await postSupportRequest({ kind: "help", topic: "beacon", details: "x", email: "   " });

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/api/account/support-request");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ kind: "help", topic: "beacon", details: "x" });
  });

  it("returns the server error code on a non-ok response", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "invalid_topic" }), { status: 400 }));

    const result = await postSupportRequest({ kind: "help", topic: "", details: "x" });

    expect(result).toEqual({ ok: false, error: "invalid_topic" });
  });

  it("returns ok:false when the request throws", async () => {
    stubFetch(() => {
      throw new Error("network");
    });

    const result = await postSupportRequest({ kind: "help", topic: "account", details: "x" });

    expect(result).toEqual({ ok: false });
  });
});
