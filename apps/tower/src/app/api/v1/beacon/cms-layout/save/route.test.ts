import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const verifyTowerApiRequest = vi.fn();
const resolveWebflowBearerToken = vi.fn();
const parseCmsLayoutSaveRequest = vi.fn();
const readUpstreamErrorMessage = vi.fn();
const resolveUserCmsLayoutFieldSlug = vi.fn();
const webflowCmsItemUrl = vi.fn();
const resolveTowerEntitlement = vi.fn();
const getActiveOrganizationIdForApiRequest = vi.fn();

vi.mock("@/server/tower-api-auth", () => ({
  verifyTowerApiRequest,
}));

vi.mock("@/server/webflow-proxy-token", () => ({
  resolveWebflowBearerToken,
}));

vi.mock("@/server/beacon-cms-layout", () => ({
  parseCmsLayoutSaveRequest,
  readUpstreamErrorMessage,
  resolveUserCmsLayoutFieldSlug,
  webflowCmsItemUrl,
}));

vi.mock("@/server/billing/entitlements", () => ({
  resolveTowerEntitlement,
}));

vi.mock("@/server/billing/session-org", () => ({
  getActiveOrganizationIdForApiRequest,
}));

describe("POST /api/v1/beacon/cms-layout/save", () => {
  const prevBeaconsSurface = process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED;
    verifyTowerApiRequest.mockReset();
    resolveWebflowBearerToken.mockReset();
    parseCmsLayoutSaveRequest.mockReset();
    readUpstreamErrorMessage.mockReset();
    resolveUserCmsLayoutFieldSlug.mockReset();
    webflowCmsItemUrl.mockReset();
    resolveTowerEntitlement.mockReset();
    getActiveOrganizationIdForApiRequest.mockReset();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (prevBeaconsSurface === undefined) {
      delete process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED = prevBeaconsSurface;
    }
  });

  it("returns 404 when the Beacons surface flag is off", async () => {
    process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED = "false";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/v1/beacon/cms-layout/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ any: "body" }),
      })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: "NOT_FOUND", message: "Not found." });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(verifyTowerApiRequest).not.toHaveBeenCalled();
  });

  it("patches the configured field slug with serialized composition JSON", async () => {
    const composition = {
      v: 1 as const,
      blocks: [{ id: "b_a1b2", type: "hero", props: { heading: "Hello" } }],
    };
    getActiveOrganizationIdForApiRequest.mockResolvedValue(null);
    resolveTowerEntitlement.mockResolvedValue({ tier: "pro", source: "user_stripe" });
    verifyTowerApiRequest.mockResolvedValue({ ok: true, userId: "user_1" });
    parseCmsLayoutSaveRequest.mockReturnValue({
      collectionId: "col_1",
      itemId: "item_1",
      composition,
    });
    resolveUserCmsLayoutFieldSlug.mockResolvedValue("layout-json");
    resolveWebflowBearerToken.mockResolvedValue("wf_token");
    webflowCmsItemUrl.mockReturnValue(new URL("https://api.webflow.com/v2/collections/col_1/items/item_1"));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/v1/beacon/cms-layout/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ any: "body" }),
      })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const requestInit = init as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    expect(body).toEqual({
      fieldData: {
        "layout-json": JSON.stringify(composition),
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ composition });
  });
});
